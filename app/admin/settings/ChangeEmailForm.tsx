"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";

// The Account card. At rest it is the current address and a Change button;
// the form only appears once someone asks for it.
export function ChangeEmailForm({ email }: { email: string | null }) {
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setEditing(false);
    setNewEmail("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-archivo text-micro text-muted-foreground">Email</span>
          <span className="type-body truncate">{email ?? "Not signed in"}</span>
        </div>
        {!editing && (
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            Change
          </Button>
        )}
      </div>

      {success && <p className="type-body-sm text-muted-foreground">Confirmation sent to both addresses.</p>}

      {editing && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4">
          <label className="flex flex-col gap-1">
            <span className="type-body-sm font-medium">New email</span>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          {/* The downstream effect: nothing changes until both inboxes confirm. */}
          <p className="type-body-sm text-muted-foreground">
            A confirmation is sent to both addresses. The change applies once confirmed.
          </p>
          {error && <p className="type-body-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={loading || !newEmail.trim()}>
              {loading && showLoader && <BirdLoader size={18} label={false} />}
              {loading ? "Sending" : "Update email"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
