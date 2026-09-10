"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 10;

// Three segments, filled by length and variety. Not a security claim, just
// enough to tell "typed something" from "typed a password".
function strength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (password.length === 0) return { level: 0, label: "Enter a new password" };
  if (password.length < MIN_LENGTH) return { level: 0, label: `At least ${MIN_LENGTH} characters` };
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length >= 14 && kinds >= 3) return { level: 3, label: "Strong" };
  if (password.length >= 12 && kinds >= 2) return { level: 2, label: "Good" };
  return { level: 1, label: "Okay" };
}

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const showLoader = useLoadingGate(loading);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const meter = strength(newPassword);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const ready = newPassword.length >= MIN_LENGTH && confirmPassword === newPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!ready) return;

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="type-body-sm font-medium">New password</span>
          <PasswordInput value={newPassword} onChange={setNewPassword} required minLength={MIN_LENGTH} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-body-sm font-medium">Confirm</span>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} required minLength={MIN_LENGTH} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div aria-hidden className="flex items-center gap-1">
            {[1, 2, 3].map((segment) => (
              <span
                key={segment}
                className={cn("h-1 w-10 rounded-pill", meter.level >= segment ? "bg-primary" : "bg-border")}
              />
            ))}
          </div>
          <span className={cn("type-body-sm", mismatch || error ? "text-destructive" : "text-muted-foreground")}>
            {error ?? (mismatch ? "Passwords do not match" : success ? "Password updated" : meter.label)}
          </span>
        </div>
        <Button type="submit" disabled={loading || !ready}>
          {loading && showLoader && <BirdLoader size={18} label={false} />}
          {loading ? "Updating" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
