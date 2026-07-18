"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/auth-events";
import { PasswordInput } from "@/components/PasswordInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      setError(error.message);
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
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col gap-2 pt-6 text-center">
            <h1 className="text-xl font-semibold text-card-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to {email}. Click it to finish setting up your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="flex-1"
                required
              />
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="flex-1"
                required
              />
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Signing up..." : "Sign up"}
            </Button>
            <a
              href="/admin/login"
              className="text-center text-sm text-muted-foreground hover:text-card-foreground"
            >
              Already have an account? Log in
            </a>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
