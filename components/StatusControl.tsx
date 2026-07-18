"use client";

import { useState } from "react";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "not_a_fit", label: "Not a fit" },
];

// Shared between the response detail page and the Leads queue. Optimistic:
// the select flips immediately and reverts on failure. onStatusChange fires
// with the same optimistic timing (and again with the old value on revert)
// so a parent list can keep its own copy of the row in sync — e.g. the
// Leads queue's status filter reacting to an inline change.
export function StatusControl({
  responseId,
  initialStatus,
  onStatusChange,
}: {
  responseId: string;
  initialStatus: string;
  onStatusChange?: (status: string) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: string) {
    setError(null);
    setLoading(true);
    const previousStatus = status;
    setStatus(newStatus);
    onStatusChange?.(newStatus);
    try {
      const res = await fetch(`/api/responses/${responseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
    } catch (err) {
      setStatus(previousStatus);
      onStatusChange?.(previousStatus);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        aria-label="Lead status"
        className="flex h-9 rounded-control border border-input bg-card px-3 py-2 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-muted-foreground">Saving...</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
