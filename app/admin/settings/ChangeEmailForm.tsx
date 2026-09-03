"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";

export function ChangeEmailForm() {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const showLoader = useLoadingGate(loading);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
      if (updateError) throw updateError;
      setSuccess(true);
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="type-body-sm font-medium">New email</span>
        <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
      </label>
      {/* The downstream effect: nothing changes until both inboxes confirm. */}
      <p className="type-body-sm text-muted-foreground">
        A confirmation is sent to both addresses. The change applies once confirmed.
      </p>
      {error && <p className="type-body-sm text-destructive">{error}</p>}
      {success && <p className="type-body-sm text-muted-foreground">Confirmation sent.</p>}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={loading || !newEmail.trim()}>
          {loading && showLoader && <BirdLoader size={18} label={false} />}
          {loading ? "Sending" : "Update email"}
        </Button>
      </div>
    </form>
  );
}
