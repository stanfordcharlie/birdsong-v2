"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthScreen, AuthField, AuthPasswordField, AuthError, AuthSubmit } from "@/components/auth/AuthScreen";

export function SignupForm({ inviteToken = null }: { inviteToken?: string | null }) {
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
    // Server-side rather than supabase.auth.signUp from the browser: the
    // route runs the same signUp call, then creates the new account's
    // organization with the service role in the same request (see
    // app/api/auth/signup/route.ts). The name fields are stored on the
    // auth.users row itself, read back via user.user_metadata wherever the
    // admin's own name is displayed (see lib/user-name.ts).
    let result: { session?: boolean; next?: string; error?: string } = {};
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          // An invited signup skips the personal organization and lands on
          // the invite's accept page instead (see the route).
          inviteToken,
        }),
      });
      result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Signup failed");
      }
    } catch (err) {
      // Some auth failures surface with a useless stringified message
      // (e.g. "{}" when Supabase's confirmation-email send 500s) — show a
      // human sentence instead of raw JSON in those cases.
      const raw = err instanceof Error ? err.message.trim() : "";
      setError(
        raw && raw !== "{}" && !raw.startsWith("{")
          ? raw
          : "We couldn't create your account just now. Sending the confirmation email failed on our end, so please try again in a bit."
      );
      setLoading(false);
      return;
    }
    if (result.session) {
      // Only reachable if email confirmation is disabled on this project;
      // the route already has an active session and set its cookies, no
      // confirmation step needed. The signup itself is logged server-side
      // via a DB trigger.
      window.location.assign(result.next || "/admin");
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
        <p className="type-body max-w-[400px] text-center text-muted-foreground">
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
          <Link
            href={inviteToken ? `/admin/login?invite=${encodeURIComponent(inviteToken)}` : "/admin/login"}
            className="font-semibold underline underline-offset-[3px]"
          >
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
        <div className="type-body-sm text-center text-faint">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="focus-ring rounded-control text-muted-foreground underline underline-offset-[3px]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="focus-ring rounded-control text-muted-foreground underline underline-offset-[3px]">
            Privacy Policy
          </Link>
          .
        </div>
      </form>
    </AuthScreen>
  );
}
