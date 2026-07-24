"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/auth-events";
import { AuthScreen, AuthField, AuthPasswordField, AuthError, AuthSubmit } from "@/components/auth/AuthScreen";

export function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/admin`,
        // Stored on the auth.users row itself (not the profiles table),
        // so it's available immediately after signup even before a
        // profiles row exists — read back via user.user_metadata
        // wherever the admin's own name is displayed (see lib/user-name.ts).
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });
    if (error) {
      // Some auth failures surface with a useless stringified message
      // (e.g. "{}" when Supabase's confirmation-email send 500s) — show a
      // human sentence instead of raw JSON in those cases.
      const raw = error.message?.trim();
      setError(
        raw && raw !== "{}" && !raw.startsWith("{")
          ? raw
          : "We couldn't create your account just now — sending the confirmation email failed on our end. Please try again in a bit."
      );
      setLoading(false);
      return;
    }
    if (data.session && data.user) {
      // Only reachable if email confirmation is disabled on this project;
      // signUp already returned an active session, no confirmation step
      // needed. The signup itself is logged server-side via a DB trigger.
      await logLoginEvent(supabase, data.user.id, data.user.email ?? null);
      window.location.assign("/admin");
      return;
    }
    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
    return (
      <AuthScreen
        heading="Check your email"
        subcopy={`We sent a confirmation link to ${email}.`}
        align="center"
        card={false}
        belowCard={
          <Link href="/admin/login" className="font-semibold underline underline-offset-[3px]">
            Back to log in
          </Link>
        }
      >
        <p className="max-w-[400px] text-center text-[15px] leading-[1.6] text-[#6f6757]">
          Click the link in that email to finish setting up your account. You can close this tab once
          you have.
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      heading="Start listening to your market"
      subcopy="Create your account and launch your first interview in minutes."
      belowCard={
        <>
          Already have an account?{" "}
          <Link href="/admin/login" className="font-semibold underline underline-offset-[3px]">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <AuthField
            label="First name"
            type="text"
            autoComplete="given-name"
            placeholder="Ada"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <AuthField
            label="Last name"
            type="text"
            autoComplete="family-name"
            placeholder="Lark"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <AuthField
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthPasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="Choose a password"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          helper="At least 8 characters."
        />
        {error && <AuthError>{error}</AuthError>}
        <AuthSubmit type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Create account"}
        </AuthSubmit>
        <div className="text-center text-[12.5px] leading-[1.55] text-[#a89d88]">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-[#6f6757] underline underline-offset-[3px]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#6f6757] underline underline-offset-[3px]">
            Privacy Policy
          </Link>
          .
        </div>
      </form>
    </AuthScreen>
  );
}
