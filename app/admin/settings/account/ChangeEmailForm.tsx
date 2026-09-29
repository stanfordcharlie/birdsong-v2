"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/admin/ui";
import { text } from "@/components/admin/ui/tokens";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { cn } from "@/lib/utils";
import { settingsInputClass, settingsLabelClass } from "../SettingsSection";

// The Email card. At rest it is the current address and a Change button;
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
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className={settingsLabelClass}>Email</span>
          <span className="truncate text-[14px] font-semibold">{email ?? "Not signed in"}</span>
        </div>
        {!editing && (
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            Change
          </Button>
        )}
      </div>

      {success && <p className={cn("text-[13px]", text.muted2)}>Confirmation sent to both addresses.</p>}

      {editing && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 border-t border-[color:hsl(var(--ds-border))] pt-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className={settingsLabelClass}>New email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoFocus
              className={settingsInputClass}
            />
          </label>
          {/* The downstream effect: nothing changes until both inboxes confirm. */}
          <p className={cn("text-[13px]", text.muted2)}>
            A confirmation is sent to both addresses. The change applies once confirmed.
          </p>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
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
