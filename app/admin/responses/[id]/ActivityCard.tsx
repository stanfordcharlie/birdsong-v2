"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, RelativeTime } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";
import { DISQUALIFY_REASON_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads/state";
import type { LeadActivityEntry } from "@/lib/leads/activity";
import { addLeadNote, type LeadActionResult } from "@/lib/leads/actions";

// The lead page's Activity tab: what has happened to this lead, and a box
// to add to it. Status and ownership live in the top bar
// (LeadHeaderControls); this card is the record of them.

const TEXTAREA_CLASSES = cn(
  "focus-ring w-full border px-3 py-2 text-[13px] leading-[1.45] placeholder:text-[color:hsl(var(--ds-muted-3))] disabled:opacity-60",
  radius.control,
  border.base,
  bg.base,
  text.ink
);

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
    <Card
      padding="flush"
      header={
        <>
          Activity <span className={cn("ds-mono-count ml-1", text.muted2)}>{activity.length}</span>
        </>
      }
    >
      {canNote && (
        <form onSubmit={submitNote} className={cn("flex flex-col gap-2 border-b px-5 py-4", border.base)}>
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
              <p role="alert" className={cn("ds-small", text.ink)}>
                {error}
              </p>
            )}
          </div>
        </form>
      )}

      {activity.length === 0 ? (
        <EmptyState title="Nothing has happened to this lead yet." className="px-5 py-5" />
      ) : (
        <ol>
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
  const line = self ? "claimed this lead" : describe(entry);
  // A status change's body is its disqualification note; a note's body is
  // the note. Either way it reads as the person's words under the line.
  const quote = entry.type === "note" || entry.type === "status_change" ? entry.body : null;

  return (
    <li className={cn("flex flex-col gap-1 border-t px-5 py-3 first:border-t-0", border.base)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="ds-body">
          <span className="font-bold">{actor}</span> {line}
        </p>
        <RelativeTime
          date={entry.createdAt}
          align="right"
          className={cn("ds-mono-count shrink-0", text.muted2)}
        />
      </div>
      {quote && <p className={cn("ds-body whitespace-pre-wrap", text.muted2)}>{quote}</p>}
    </li>
  );
}
