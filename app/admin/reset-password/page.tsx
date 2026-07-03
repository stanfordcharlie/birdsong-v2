"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(
        error.message.includes("Auth session missing")
          ? "This reset link has expired or already been used. Request a new one."
          : error.message
      );
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PasswordInput
              placeholder="New password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            <PasswordInput
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Set new password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
