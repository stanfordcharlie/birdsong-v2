"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, RelativeTime } from "@/components/admin/ui";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import {
  DISQUALIFY_REASONS,
  DISQUALIFY_REASON_LABELS,
  LEAD_STATUS_LABELS,
  nextStatuses,
  type DisqualifyReason,
  type LeadStatus,
} from "@/lib/leads/state";
import type { LeadActivityEntry } from "@/lib/leads/activity";
import {
  addLeadNote,
  assignLead,
  claimLead,
  setLeadStatus,
  unassignLead,
  type LeadActionResult,
} from "@/lib/leads/actions";
import { Section } from "./Section";

// The part of the response detail page a rep writes to: where the lead is,
// who holds it, what has been said about it, and what happened to it.
//
// Every value shown here comes from the server render. An action runs,
// then router.refresh() re-renders the page from the database inside the
// same transition, so `pending` covers the whole round trip and nothing on
// screen is ever a guess about what the server will say.

export type WorkflowMember = { id: string; name: string };

export type WorkflowPermissions = {
  claim: boolean;
  assignOthers: boolean;
  setStatus: boolean;
  note: boolean;
};

const INPUT_CLASSES =
  "focus-ring flex h-9 rounded-control border border-input bg-card px-3 font-archivo text-sm text-card-foreground disabled:opacity-60";
const TEXTAREA_CLASSES =
  "focus-ring w-full rounded-control border border-input bg-card px-3 py-2 font-archivo text-sm text-card-foreground placeholder:text-faint disabled:opacity-60";

export function LeadWorkflowPanel({
  responseId,
  leadStatus,
  assignedTo,
  assigneeName,
  disqualifyReason,
  disqualifyNote,
  members,
  currentUserId,
  permissions,
  activity,
}: {
  responseId: string;
  leadStatus: LeadStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  disqualifyReason: DisqualifyReason | null;
  disqualifyNote: string | null;
  members: WorkflowMember[];
  currentUserId: string;
  permissions: WorkflowPermissions;
  /** Newest first. */
  activity: LeadActivityEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Status draft: the move the rep has picked but not yet confirmed.
  const [nextStatus, setNextStatus] = useState<LeadStatus | "">("");
  const [reason, setReason] = useState<DisqualifyReason | "">("");
  const [reasonNote, setReasonNote] = useState("");

  const [noteDraft, setNoteDraft] = useState("");

  const options = nextStatuses(leadStatus);
  const mine = assignedTo !== null && assignedTo === currentUserId;
  const canUnassign = assignedTo !== null && (mine ? permissions.claim : permissions.assignOthers);

  function run(action: () => Promise<LeadActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  function submitStatus(e: FormEvent) {
    e.preventDefault();
    if (!nextStatus) return;
    run(
      () =>
        setLeadStatus(responseId, nextStatus, {
          disqualifyReason: reason || null,
          disqualifyNote: reasonNote,
        }),
      () => {
        setNextStatus("");
        setReason("");
        setReasonNote("");
      }
    );
  }

  function submitNote(e: FormEvent) {
    e.preventDefault();
    run(
      () => addLeadNote(responseId, noteDraft),
      () => setNoteDraft("")
    );
  }

  function handleAssignSelect(value: string) {
    if (value === "") return run(() => unassignLead(responseId));
    if (value === currentUserId) return run(() => claimLead(responseId));
    return run(() => assignLead(responseId, value));
  }

  const disqualifying = nextStatus === "disqualified";
  const statusReady =
    nextStatus !== "" && (!disqualifying || (reason !== "" && (reason !== "other" || reasonNote.trim())));

  return (
    <>
      <Section label="Status">
        <div className="flex flex-col gap-3">
          <form onSubmit={submitStatus} className="flex flex-wrap items-center gap-2">
            <LeadStatusBadge status={leadStatus} />
            {permissions.setStatus && options.length > 0 && (
              <>
                <select
                  value={nextStatus}
                  disabled={pending}
                  onChange={(e) => {
                    setNextStatus(e.target.value as LeadStatus | "");
                    setReason("");
                    setReasonNote("");
                  }}
                  aria-label="Move this lead to"
                  className={INPUT_CLASSES}
                >
                  <option value="">Move to</option>
                  {options.map((status) => (
                    <option key={status} value={status}>
                      {LEAD_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                {disqualifying && (
                  <select
                    value={reason}
                    disabled={pending}
                    required
                    onChange={(e) => setReason(e.target.value as DisqualifyReason | "")}
                    aria-label="Reason for disqualifying"
                    className={INPUT_CLASSES}
                  >
                    <option value="">Choose a reason</option>
                    {DISQUALIFY_REASONS.map((value) => (
                      <option key={value} value={value}>
                        {DISQUALIFY_REASON_LABELS[value]}
                      </option>
                    ))}
                  </select>
                )}
                <Button type="submit" size="sm" disabled={pending || !statusReady}>
                  {pending ? "Saving" : "Update"}
                </Button>
              </>
            )}
          </form>

          {disqualifying && reason === "other" && (
            <label className="admin-measure flex flex-col gap-1.5">
              <span className="font-archivo text-micro text-muted-foreground">Why this lead is out</span>
              <textarea
                value={reasonNote}
                disabled={pending}
                required
                rows={2}
                maxLength={4000}
                onChange={(e) => setReasonNote(e.target.value)}
                className={TEXTAREA_CLASSES}
              />
            </label>
          )}

          {leadStatus === "disqualified" && disqualifyReason && (
            <div className="admin-measure flex flex-col gap-1">
              <p className="type-body text-muted-foreground">
                Reason: {DISQUALIFY_REASON_LABELS[disqualifyReason]}
              </p>
              {disqualifyNote && (
                <p className="type-body border-l border-border pl-3 italic text-muted-foreground">
                  {disqualifyNote}
                </p>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section label="Assignment">
        <div className="flex flex-wrap items-center gap-2">
          <span className={assignedTo ? "type-body" : "type-body text-muted-foreground"}>
            {assignedTo
              ? mine
                ? "Assigned to you"
                : `Assigned to ${assigneeName ?? "a former teammate"}`
              : "Unassigned"}
          </span>
          {permissions.claim && !assignedTo && (
            <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(() => claimLead(responseId))}>
              Claim
            </Button>
          )}
          {canUnassign && (
            <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(() => unassignLead(responseId))}>
              Unassign
            </Button>
          )}
          {permissions.assignOthers && (
            <select
              value={assignedTo ?? ""}
              disabled={pending}
              onChange={(e) => handleAssignSelect(e.target.value)}
              aria-label="Assign this lead to a teammate"
              className={INPUT_CLASSES}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === currentUserId ? "Me" : member.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </Section>

      <Section label="Activity">
        <div className="flex flex-col gap-4">
          {permissions.note && (
            <form onSubmit={submitNote} className="admin-measure flex flex-col gap-2">
              <textarea
                value={noteDraft}
                disabled={pending}
                rows={3}
                maxLength={4000}
                placeholder="Add a note for the team"
                aria-label="New note"
                onChange={(e) => setNoteDraft(e.target.value)}
                className={TEXTAREA_CLASSES}
              />
              <div>
                <Button type="submit" size="sm" variant="secondary" disabled={pending || !noteDraft.trim()}>
                  Add note
                </Button>
              </div>
            </form>
          )}

          {error && (
            <p role="alert" className="type-body-sm text-destructive">
              {error}
            </p>
          )}

          {activity.length === 0 ? (
            <EmptyState title="Nothing has happened to this lead yet." className="py-0" />
          ) : (
            <Card padding="flush">
              <ol className="divide-y divide-border">
                {activity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} currentUserId={currentUserId} />
                ))}
              </ol>
            </Card>
          )}
        </div>
      </Section>
    </>
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
    <li className="flex flex-col gap-1 px-4 py-3">
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
