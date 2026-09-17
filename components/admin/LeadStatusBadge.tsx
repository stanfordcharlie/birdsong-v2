import { Badge } from "@/components/admin/ui";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/leads/state";

// Every lead status pill in admin. One mapping from status to Badge
// variant, so the queue and the response detail page cannot colour the
// same status two ways. Only the existing variants are used: the two
// forward-motion states take the brand tint, a closed-out lead goes muted,
// and everything in between is the neutral outline.
const VARIANT: Record<LeadStatus, "count" | "outline" | "live" | "draft"> = {
  new: "count",
  assigned: "outline",
  contacted: "outline",
  nurture: "outline",
  meeting_booked: "live",
  qualified: "live",
  disqualified: "draft",
};

export function LeadStatusBadge({
  status,
  size = "default",
  className,
}: {
  status: LeadStatus;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <Badge variant={VARIANT[status]} size={size} className={className}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
