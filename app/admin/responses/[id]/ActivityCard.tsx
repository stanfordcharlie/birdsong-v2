"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, RelativeTime } from "@/components/admin/ui";
import { DISQUALIFY_REASON_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads/state";
import type { LeadActivityEntry } from "@/lib/leads/activity";
import { addLeadNote, type LeadActionResult } from "@/lib/leads/actions";

// The foot of the response detail page: what has happened to this lead, and
// a box to add to it. Status and ownership moved up to the header
// (LeadHeaderControls); this card is the record of them.

const TEXTAREA_CLASSES =
  "focus-ring w-full rounded-control border border-input bg-card px-3 py-2 font-archivo text-sm text-card-foreground placeholder:text-faint disabled:opacity-60";

export function ActivityCard({
  responseId,
  currentUserId,
  canNote,
  activity,
}: {
  responseId: string;
  currentUserId: string;
  canNote: boolean;
  /** Newest first. */
  activity: LeadActivityEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  function submitNote(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result: LeadActionResult = await addLeadNote(responseId, noteDraft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNoteDraft("");
      router.refresh();
    });
  }

  return (
    <Card padding="flush">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h2 className="type-heading">Activity</h2>
        <span className="type-meta tabular-nums">
          {activity.length} {activity.length === 1 ? "event" : "events"}
        </span>
      </div>

      {canNote && (
        <form onSubmit={submitNote} className="flex flex-col gap-2 border-b border-border px-6 py-4">
          <textarea
            value={noteDraft}
            disabled={pending}
            rows={2}
            maxLength={4000}
            placeholder="Add a note for the team"
            aria-label="New note"
            onChange={(e) => setNoteDraft(e.target.value)}
            className={TEXTAREA_CLASSES}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" variant="secondary" disabled={pending || !noteDraft.trim()}>
              {pending ? "Saving" : "Add note"}
            </Button>
            {error && (
              <p role="alert" className="type-body-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </form>
      )}

      {activity.length === 0 ? (
        <EmptyState title="Nothing has happened to this lead yet." className="px-6 py-6" />
      ) : (
        <ol className="divide-y divide-border">
          {activity.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} currentUserId={currentUserId} />
          ))}
        </ol>
      )}
    </Card>
  );
}

function describe(entry: LeadActivityEntry): string {
  switch (entry.type) {
    case "status_change": {
      const to = entry.toStatus ? LEAD_STATUS_LABELS[entry.toStatus] : "an unknown status";
      const from = entry.fromStatus ? ` from ${LEAD_STATUS_LABELS[entry.fromStatus]}` : "";
      const reason = entry.disqualifyReason ? ` (${DISQUALIFY_REASON_LABELS[entry.disqualifyReason]})` : "";
      return `moved this lead${from} to ${to}${reason}`;
    }
    case "assigned":
      return entry.assigneeName ? `assigned this lead to ${entry.assigneeName}` : "assigned this lead";
    case "unassigned":
      return "unassigned this lead";
    case "note":
      return "added a note";
    case "crm_push":
      return "pushed this lead to HubSpot";
  }
}

function ActivityRow({ entry, currentUserId }: { entry: LeadActivityEntry; currentUserId: string }) {
  const actor = entry.actorId
    ? entry.actorId === currentUserId
      ? "You"
      : (entry.actorName ?? "A former teammate")
    : "Birdsong";
  // "You claimed this lead" rather than "You assigned this lead to You".
  const self = entry.type === "assigned" && entry.actorId !== null && entry.assigneeName === entry.actorName;
  const text = self ? "claimed this lead" : describe(entry);
  // A status change's body is its disqualification note; a note's body is
  // the note. Either way it reads as the person's words under the line.
  const quote = entry.type === "note" || entry.type === "status_change" ? entry.body : null;

  return (
    <li className="flex flex-col gap-1 px-6 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="type-body">
          <span className="font-medium">{actor}</span> {text}
        </p>
        <RelativeTime date={entry.createdAt} align="right" className="type-meta shrink-0" />
      </div>
      {quote && <p className="type-body whitespace-pre-wrap text-muted-foreground">{quote}</p>}
    </li>
  );
}
