import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/leads/state";
import { bg, border, dot, radius, text } from "./tokens";

/**
 * The status badge: 26px, chip radius, a 6px dot and one word.
 *
 * Pass `state`. The label, the dot and the ground all come from the table
 * below, so the same state cannot be worded or coloured two ways.
 *
 * `variant` with children is the older free-text form. It is kept, on the
 * same shape, for the call sites that label something the state table does
 * not cover (a count, a test marker); a status uses `state`.
 */
export type BadgeState =
  | "new"
  | "assigned"
  | "contacted"
  | "nurture"
  | "meeting"
  | "qualified"
  | "disqualified"
  | "hubspot"
  | "live"
  | "draft"
  | "failed";

const STATES: Record<BadgeState, { label: string; dot: string; ground: string; ink: string }> = {
  new: { label: "New", dot: dot.statusNew, ground: bg.statusNew, ink: text.statusNew },
  // Picked up but not yet worked: the same neutral as Contacted, because
  // neither is a reason to act.
  assigned: { label: "Assigned", dot: dot.muted2, ground: bg.track, ink: text.ink3 },
  contacted: { label: "Contacted", dot: dot.muted2, ground: bg.track, ink: text.ink3 },
  nurture: { label: "Nurture", dot: dot.muted2, ground: bg.track, ink: text.ink3 },
  meeting: { label: "Meeting", dot: dot.warn, ground: bg.warnBadge, ink: text.warn },
  qualified: { label: "Qualified", dot: dot.accent, ground: bg.accentWeak, ink: text.accent },
  disqualified: { label: "Disqualified", dot: dot.muted3, ground: bg.track, ink: text.ink3 },
  hubspot: { label: "In HubSpot", dot: dot.accent, ground: bg.accentWeak, ink: text.accent },
  live: { label: "Live", dot: dot.accent, ground: bg.accentWeak, ink: text.accent },
  draft: { label: "Draft", dot: dot.muted3, ground: bg.track, ink: text.ink3 },
  // A dot and a word on no ground; the text takes the colour around it.
  failed: { label: "Failed", dot: dot.danger, ground: "px-0", ink: "" },
};

export const BADGE_STATES = Object.keys(STATES) as BadgeState[];

/**
 * The badge state for each lead status, so the queue and the lead page
 * cannot show the same status two ways.
 */
export const LEAD_STATUS_BADGE_STATE: Record<LeadStatus, BadgeState> = {
  new: "new",
  assigned: "assigned",
  contacted: "contacted",
  nurture: "nurture",
  meeting_booked: "meeting",
  qualified: "qualified",
  disqualified: "disqualified",
};

const adminBadgeVariants = cva(
  // A status label never wraps, and its padding is px so the badge is the
  // same size at any browser font setting.
  cn("inline-flex items-center gap-1.5 whitespace-nowrap font-bold", radius.chip),
  {
    variants: {
      variant: {
        count: cn(bg.track, text.ink3),
        accent: cn(bg.accentWeak, text.accent),
        live: cn(bg.accentWeak, text.accent),
        draft: cn(bg.track, text.ink3),
        warning: cn(bg.warnBadge, text.warn),
        outline: cn("border", border.base, text.ink3),
      },
      size: {
        default: "ds-caption h-[26px] px-[10px] font-bold",
        sm: "ds-mono-kbd h-[20px] px-[6px] font-medium",
      },
    },
    defaultVariants: { variant: "count", size: "default" },
  }
);

export interface AdminBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof adminBadgeVariants> {
  /** The state to show. Supplies its own label, dot and ground. */
  state?: BadgeState;
}

export function Badge({ className, variant, size, state, children, ...props }: AdminBadgeProps) {
  if (state) {
    const s = STATES[state];
    return (
      <span
        className={cn(adminBadgeVariants({ variant: null, size }), s.ground, s.ink, className)}
        {...props}
      >
        <span aria-hidden className={cn("h-[6px] w-[6px] shrink-0 rounded-full", s.dot)} />
        {s.label}
      </span>
    );
  }
  return (
    <span className={cn(adminBadgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  );
}

export { adminBadgeVariants };
