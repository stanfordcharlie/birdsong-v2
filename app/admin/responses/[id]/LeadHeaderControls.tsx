"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, LEAD_STATUS_BADGE_STATE } from "@/components/admin/ui";
import { bg, border, dot, radius, shadow, text } from "@/components/admin/ui/tokens";
import { SelectControl } from "@/app/admin/leads/controls";
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

// The lead's stage and its owner, in the top bar: the status badge, the
// assignee control, and a menu holding the moves a lead can make from the
// stage it is in. Notes and the trail live on the Activity tab.
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
  pushToCrm: boolean;
};

const FIELD = cn(
  "focus-ring w-full border px-3 text-[13px] disabled:opacity-60",
  radius.control,
  border.base,
  bg.base,
  text.ink
);
const POPOVER = cn(
  "absolute right-0 top-full z-40 mt-2 flex flex-col border",
  radius.control,
  border.base,
  bg.base,
  shadow.input
);

/** What the menu calls the move to each status. */
function moveLabel(from: LeadStatus, to: LeadStatus): string {
  if (to === "disqualified") return "Disqualify";
  if (to === "new" && from === "disqualified") return "Reopen";
  return `Move to ${LEAD_STATUS_LABELS[to]}`;
}

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
  const [menuOpen, setMenuOpen] = useState(false);

  // Disqualifying needs a reason, so that one move opens a small form in
  // place of the menu instead of applying on click.
  const [disqualifying, setDisqualifying] = useState(false);
  const [reason, setReason] = useState<DisqualifyReason | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const moreRef = useRef<HTMLDivElement>(null);

  const open = menuOpen || disqualifying;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) closeAll();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAll();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeAll() {
    setMenuOpen(false);
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

  function handleMove(status: LeadStatus) {
    if (status === "disqualified") {
      setMenuOpen(false);
      setDisqualifying(true);
      return;
    }
    closeAll();
    run(() => setLeadStatus(responseId, status));
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
      closeAll
    );
  }

  function handleAssignSelect(value: string) {
    if (value === "") return run(() => unassignLead(responseId));
    if (value === currentUserId) return run(() => claimLead(responseId));
    return run(() => assignLead(responseId, value));
  }

  const disqualifyReady = reason !== "" && (reason !== "other" || reasonNote.trim().length > 0);

  return (
    <>
      {/* An error is a sentence, so it leads the group rather than pushing
          the three controls apart. */}
      {error && (
        <p role="alert" className={cn("ds-small flex max-w-[360px] items-center gap-2", text.ink)}>
          <span aria-hidden className={cn("h-[6px] w-[6px] shrink-0 rounded-full", dot.danger)} />
          <span className="truncate" title={error}>
            {error}
          </span>
        </p>
      )}

      <Badge state={LEAD_STATUS_BADGE_STATE[leadStatus]} className="h-[34px] px-[12px]" />

      {/* Owner. With the assign-others permission the control is the select;
          with only the claim permission it is Claim while nobody holds the
          lead, and the holder's name after. */}
      {permissions.assignOthers ? (
        <SelectControl
          muted={!assignedTo}
          value={assignedTo ?? ""}
          disabled={pending}
          onChange={(e) => handleAssignSelect(e.target.value)}
          aria-label="Assign this lead to a teammate"
          className="max-w-[200px]"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.id === currentUserId ? "Me" : member.name}
            </option>
          ))}
          {assignedTo && !members.some((member) => member.id === assignedTo) && (
            <option value={assignedTo}>{assigneeName ?? "Former teammate"}</option>
          )}
        </SelectControl>
      ) : assignedTo ? (
        <>
          <span className={cn("ds-small", text.muted2)}>
            {mine ? "Assigned to you" : `Assigned to ${assigneeName ?? "a former teammate"}`}
          </span>
          {canUnassign && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => unassignLead(responseId))}
            >
              Unassign
            </Button>
          )}
        </>
      ) : (
        permissions.claim && (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => claimLead(responseId))}
          >
            Claim
          </Button>
        )
      )}

      {permissions.setStatus && options.length > 0 && (
        <div ref={moreRef} className="relative">
          <Button
            type="button"
            variant="secondary"
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={pending}
            onClick={() => (open ? closeAll() : setMenuOpen(true))}
            className={cn("w-[34px] px-0 text-[16px] font-extrabold", text.muted)}
          >
            ···
          </Button>

          {menuOpen && (
            <div role="menu" className={cn(POPOVER, "w-[220px] p-1")}>
              {options.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  onClick={() => handleMove(status)}
                  className={cn(
                    "focus-ring flex h-[34px] items-center px-[10px] text-left text-[13px] font-semibold hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
                    radius.chip,
                    text.ink3
                  )}
                >
                  {moveLabel(leadStatus, status)}
                </button>
              ))}
            </div>
          )}

          {disqualifying && (
            <form onSubmit={submitDisqualify} className={cn(POPOVER, "w-[320px] gap-3 p-4")}>
              <p className="ds-body-strong">Disqualify this lead</p>
              <SelectControl
                value={reason}
                disabled={pending}
                required
                autoFocus
                onChange={(e) => setReason(e.target.value as DisqualifyReason | "")}
                aria-label="Reason for disqualifying"
                className="w-full"
              >
                <option value="">Choose a reason</option>
                {DISQUALIFY_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {DISQUALIFY_REASON_LABELS[value]}
                  </option>
                ))}
              </SelectControl>
              {reason === "other" && (
                <label className="flex flex-col gap-1.5">
                  <span className={cn("ds-caption", text.muted2)}>Why this lead is out</span>
                  <textarea
                    value={reasonNote}
                    disabled={pending}
                    required
                    rows={2}
                    maxLength={4000}
                    onChange={(e) => setReasonNote(e.target.value)}
                    className={cn(FIELD, "py-2 leading-[1.45]")}
                  />
                </label>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={closeAll}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending || !disqualifyReady}>
                  {pending ? "Saving" : "Disqualify"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
