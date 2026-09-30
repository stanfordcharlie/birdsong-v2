import { Badge, StatusDot, type AdminBadgeProps } from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";

// The two prospect cells that more than one table draws: the status badge
// and the Instantly sequence state. The roster page and the study page's
// preview both render them from here, so a prospect can never look
// different on the two screens.

// The four states a prospect moves through, in funnel order, so filter
// tabs and count lines read left to right the same way.
export const PROSPECT_STATUSES = ["pending", "sent", "started", "completed"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  started: "Started",
  completed: "Completed",
};

// Existing Badge variants only. Nothing new is invented for a fifth state:
// the funnel gets flatter as it goes, so the two ends are the two that carry
// colour and the middle stays neutral.
const STATUS_VARIANTS: Record<string, AdminBadgeProps["variant"]> = {
  pending: "draft",
  sent: "outline",
  started: "accent",
  completed: "live",
};

export function prospectStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function ProspectStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "count"}>{prospectStatusLabel(status)}</Badge>;
}

// Where the prospect is in their Instantly sequence. Read-only, and in the
// order that answers "what is happening to this person now":
//
//   Removed   they finished and the completion path took them out of the
//             campaign, so the step they reached no longer matters
//   <error>   that move failed and needs a person in Instantly (full text on
//             hover, from the column's `title`)
//   Step N    Instantly's webhook reported sending them step N
//   EMPTY     nothing has been reported: not run through Instantly, or the
//             sequence has not reached them yet
export function ProspectSequenceCell({
  removedAt,
  error,
  step,
}: {
  removedAt: string | null;
  error: string | null;
  /** The last step Instantly reported sending. Null until one arrives. */
  step?: number | null;
}) {
  if (removedAt) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <StatusDot live />
        Removed
      </span>
    );
  }
  if (error) return <span className="text-destructive">{error}</span>;
  if (step != null) return <span className="whitespace-nowrap">Step {step}</span>;
  return <>{EMPTY_VALUE}</>;
}
