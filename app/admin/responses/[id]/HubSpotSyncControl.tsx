"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";

// Manual retry for the HubSpot sync that already runs by itself when an
// interview completes. It exists because that automatic run is fire-and-forget
// on a path that must never block the respondent: when it fails, its only
// trace is a server log, and this button is how a rep recovers from that
// without waiting for anyone to read one.
//
// Safe to press repeatedly. The route matches the contact by email and
// updates it, so a re-sync refreshes the record rather than creating a second
// one; a deal is only opened if the lead scores high enough.
export function HubSpotSyncControl({
  responseId,
  initialSyncedAt,
  disabledReason,
}: {
  responseId: string;
  initialSyncedAt: string | null;
  /** Set when the response cannot be synced at all (test run, unfinished). */
  disabledReason?: string | null;
}) {
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/responses/${responseId}/hubspot-sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reason || "Failed to sync to HubSpot");
      setSyncedAt(typeof data.syncedAt === "string" ? data.syncedAt : new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pb-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleSync}
        disabled={loading || Boolean(disabledReason)}
      >
        {loading ? "Syncing..." : syncedAt ? "Re-sync to HubSpot" : "Sync to HubSpot"}
      </Button>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        <span className="type-meta">
          {disabledReason ?? (syncedAt ? `Synced ${formatRelativeTime(syncedAt)}.` : "Not synced yet.")}
        </span>
      )}
    </div>
  );
}
