"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { cn } from "@/lib/utils";
import {
  DISQUALIFY_REASONS,
  DISQUALIFY_REASON_LABELS,
  LEAD_STATUS_LABELS,
  nextStatuses,
  type DisqualifyReason,
  type LeadStatus,
} from "@/lib/leads/state";
import {
  assignLead,
  claimLead,
  setLeadStatus,
  unassignLead,
  type LeadActionResult,
} from "@/lib/leads/actions";

// The lead's stage and its owner, as two controls in the page header: the
// two things a rep changes about a lead, next to the name they belong to.
// Notes and the trail stay in the activity card at the foot of the page.
//
// Every value shown here comes from the server render. An action runs, then
// router.refresh() re-renders the page from the database inside the same
// transition, so `pending` covers the whole round trip and nothing on
// screen is ever a guess about what the server will say.

export type WorkflowMember = { id: string; name: string };

export type WorkflowPermissions = {
  claim: boolean;
  assignOthers: boolean;
  setStatus: boolean;
  note: boolean;
};

// The dot inside the status control: forward motion takes the accent, work
// in progress takes amber, and a lead nobody has touched or that is out of
// play takes the faint grey. Same three readings as the status badge's
// three variants, drawn as a dot because the control is a select.
const DOT: Record<LeadStatus, string> = {
  new: "bg-faint",
  assigned: "bg-warning",
  contacted: "bg-warning",
  nurture: "bg-warning",
  meeting_booked: "bg-brand",
  qualified: "bg-brand",
  disqualified: "bg-faint",
};

const PILL_SELECT =
  "focus-ring h-10 max-w-full appearance-none rounded-pill border border-border bg-card pr-9 font-archivo text-sm font-semibold text-card-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50";
const INPUT_CLASSES =
  "focus-ring flex h-9 w-full rounded-control border border-input bg-card px-3 font-archivo text-sm text-card-foreground disabled:opacity-60";
const TEXTAREA_CLASSES =
  "focus-ring w-full rounded-control border border-input bg-card px-3 py-2 font-archivo text-sm text-card-foreground placeholder:text-faint disabled:opacity-60";

export function LeadHeaderControls({
  responseId,
  leadStatus,
  assignedTo,
  assigneeName,
  members,
  currentUserId,
  permissions,
}: {
  responseId: string;
  leadStatus: LeadStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  members: WorkflowMember[];
  currentUserId: string;
  permissions: WorkflowPermissions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Disqualifying needs a reason, so that one move opens a small form under
  // the control instead of applying on change.
  const [disqualifying, setDisqualifying] = useState(false);
  const [reason, setReason] = useState<DisqualifyReason | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const popoverRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!disqualifying) return;
    function onPointerDown(event: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) closeDisqualify();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDisqualify();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [disqualifying]);

  function closeDisqualify() {
    setDisqualifying(false);
    setReason("");
    setReasonNote("");
  }

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

  function handleStatusSelect(value: string) {
    if (value === leadStatus) return;
    if (value === "disqualified") {
      setDisqualifying(true);
      return;
    }
    run(() => setLeadStatus(responseId, value));
  }

  function submitDisqualify(e: FormEvent) {
    e.preventDefault();
    if (!reason) return;
    run(
      () =>
        setLeadStatus(responseId, "disqualified", {
          disqualifyReason: reason,
          disqualifyNote: reasonNote,
        }),
      closeDisqualify
    );
  }

  function handleAssignSelect(value: string) {
    if (value === "") return run(() => unassignLead(responseId));
    if (value === currentUserId) return run(() => claimLead(responseId));
    return run(() => assignLead(responseId, value));
  }

  const disqualifyReady = reason !== "" && (reason !== "other" || reasonNote.trim().length > 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Stage. A select drawn as the status pill, with the dot inside it,
          so the header shows the status once and that one showing is the
          control. Without the permission it is the plain badge. */}
      {permissions.setStatus && options.length > 0 ? (
        <div className="relative">
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-pill",
              DOT[leadStatus]
            )}
          />
          <select
            value={leadStatus}
            disabled={pending}
            onChange={(e) => handleStatusSelect(e.target.value)}
            aria-label="Lead status"
            className={cn(PILL_SELECT, "pl-9")}
          >
            <option value={leadStatus}>{LEAD_STATUS_LABELS[leadStatus]}</option>
            {options.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <Chevron />

          {disqualifying && (
            <form
              ref={popoverRef}
              onSubmit={submitDisqualify}
              className="absolute right-0 top-full z-30 mt-2 flex w-80 flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card"
            >
              <p className="type-body font-medium">Disqualify this lead</p>
              <select
                value={reason}
                disabled={pending}
                required
                autoFocus
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
              {reason === "other" && (
                <label className="flex flex-col gap-1.5">
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
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={closeDisqualify}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending || !disqualifyReady}>
                  {pending ? "Saving" : "Disqualify"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <LeadStatusBadge status={leadStatus} />
      )}

      {/* Owner. Claim is the one-click move for a rep; the select is for
          handing a lead to someone else. */}
      {permissions.claim && !assignedTo && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => claimLead(responseId))}
        >
          <PlusIcon />
          Claim
        </Button>
      )}
      {permissions.assignOthers ? (
        <div className="relative">
          <select
            value={assignedTo ?? ""}
            disabled={pending}
            onChange={(e) => handleAssignSelect(e.target.value)}
            aria-label="Assign this lead to a teammate"
            className={cn(PILL_SELECT, "pl-4")}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.id === currentUserId ? "Me" : member.name}
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      ) : (
        assignedTo && (
          <>
            <span className="type-meta">
              {mine ? "Assigned to you" : `Assigned to ${assigneeName ?? "a former teammate"}`}
            </span>
            {canUnassign && (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => unassignLead(responseId))}>
                Unassign
              </Button>
            )}
          </>
        )
      )}

      {error && (
        <p role="alert" className="type-body-sm basis-full text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
