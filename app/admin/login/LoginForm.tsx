"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/auth-events";
import { AuthScreen, AuthField, AuthPasswordField, AuthError, AuthSubmit } from "@/components/auth/AuthScreen";

export function LoginForm({
  notice = null,
  inviteToken = null,
}: {
  notice?: string | null;
  inviteToken?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Seeded from a server-provided notice (e.g. an expired confirmation link
  // routed here by the auth callback); cleared once the user starts a submit.
  const [error, setError] = useState<string | null>(notice);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await logLoginEvent(supabase, data.user.id, data.user.email ?? null);
    }
    // Full navigation so middleware re-reads the freshly set auth cookies.
    // An invited login returns to the invite's accept page.
    window.location.assign(inviteToken ? `/invite/${inviteToken}` : "/admin");
  }

  return (
    <AuthScreen
      heading="Welcome back"
      subcopy="Log in to your Birdsong account."
      belowCard={
        <>
          New to Birdsong?{" "}
          <Link
            href={inviteToken ? `/admin/signup?invite=${encodeURIComponent(inviteToken)}` : "/admin/signup"}
            className="font-semibold underline underline-offset-[3px]"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField
          label="Work email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthPasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={setPassword}
          required
          // Enter in the password field submits explicitly. The browser's
          // implicit submission (click the form's submit button) is what
          // Enter normally does, but that click is easy for an autofill
          // dropdown or an extension to intercept; requestSubmit() goes
          // straight to the form and still runs validation.
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          labelAccessory={
            <Link
              href="/admin/forgot-password"
              className="focus-ring type-body-sm rounded-control text-muted-foreground underline underline-offset-[3px]"
            >
              Forgot your password?
            </Link>
          }
        />
        {error && <AuthError>{error}</AuthError>}
        <AuthSubmit type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </AuthSubmit>
      </form>
    </AuthScreen>
  );
}
