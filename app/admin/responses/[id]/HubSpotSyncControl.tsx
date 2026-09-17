"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";
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
  const router = useRouter();
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
      // The push wrote to the activity trail and may have advanced the lead
      // (lib/hubspot-sync.ts); the workflow panel below re-reads both.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Sits in the page header's action group, so it carries no padding of its
    // own; the header owns the spacing around it.
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleSync}
        disabled={loading || Boolean(disabledReason)}
      >
        {loading ? "Syncing" : "Sync to HubSpot"}
      </Button>
      {error ? (
        <span className="type-body-sm text-destructive">{error}</span>
      ) : (
        <span className="type-meta">
          {disabledReason ?? (syncedAt ? `Synced ${formatRelativeTime(syncedAt)}` : "Not synced")}
        </span>
      )}
    </div>
  );
}
