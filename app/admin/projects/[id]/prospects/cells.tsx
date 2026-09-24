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

// What happened in Instantly at completion. Read-only: a dot and a word
// when they were moved out of their campaign, the failure text (full text
// on hover, from the column's `title`) when the move failed, nothing until
// then. Fixing a failure is a manual job in Instantly, so there is no
// button here.
export function ProspectSequenceCell({ removedAt, error }: { removedAt: string | null; error: string | null }) {
  if (removedAt) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <StatusDot live />
        Removed
      </span>
    );
  }
  if (error) return <span className="text-destructive">{error}</span>;
  return <>{EMPTY_VALUE}</>;
}
