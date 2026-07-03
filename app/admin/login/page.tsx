"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/auth-events";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
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
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              name="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
            <div className="flex flex-col items-center gap-1">
              <a href="/admin/signup" className="text-sm text-muted-foreground hover:text-card-foreground">
                Need an account? Sign up
              </a>
              <a
                href="/admin/forgot-password"
                className="text-sm text-muted-foreground hover:text-card-foreground"
              >
                Forgot your password?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
