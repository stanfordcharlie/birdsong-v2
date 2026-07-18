"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">New password</span>
        <PasswordInput value={newPassword} onChange={setNewPassword} required minLength={6} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Confirm new password</span>
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={6}
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-muted-foreground">Password updated.</p>}
      <div>
        <Button type="submit" disabled={loading || !newPassword || !confirmPassword}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </div>
    </form>
  );
}
