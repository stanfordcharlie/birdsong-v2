"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/auth-events";
import { AuthScreen, AuthField, AuthPasswordField, AuthError, AuthSubmit } from "@/components/auth/AuthScreen";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
    window.location.assign("/admin");
  }

  return (
    <AuthScreen
      heading="Welcome back"
      subcopy="Log in to your Birdsong account."
      belowCard={
        <>
          New to Birdsong?{" "}
          <Link href="/admin/signup" className="font-semibold underline underline-offset-[3px]">
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
          labelAccessory={
            <Link
              href="/admin/forgot-password"
              className="text-[13px] text-[#6f6757] underline underline-offset-[3px]"
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
