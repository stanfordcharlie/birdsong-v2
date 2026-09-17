// The lead state machine. One map, read by the server actions to decide what
// is legal and by the UI to decide what to offer, so the two can never
// disagree about which moves exist.
//
// Kept free of server-only imports so client components can import it.

export const LEAD_STATUSES = [
  "new",
  "assigned",
  "contacted",
  "meeting_booked",
  "qualified",
  "disqualified",
  "nurture",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

/** Sentence case, as every status reads in the UI. */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  assigned: "Assigned",
  contacted: "Contacted",
  meeting_booked: "Meeting booked",
  qualified: "Qualified",
  disqualified: "Disqualified",
  nurture: "Nurture",
};

/**
 * Every legal `setLeadStatus` move, keyed by the status a lead is in.
 *
 * `assigned` is deliberately absent as a destination: a lead becomes
 * assigned by being claimed or assigned (which sets an assignee), and drops
 * back to `new` by being unassigned. Those two moves are owned by the
 * assignment actions in lib/leads/actions.ts, because a status of "assigned"
 * with nobody assigned is not a state a lead can be in.
 *
 * Terminal-ish states can be reopened rather than being dead ends: a
 * disqualified lead goes back to `new`, a qualified one can still be
 * disqualified if the deal falls apart.
 */
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ["contacted", "nurture", "disqualified"],
  assigned: ["contacted", "nurture", "disqualified"],
  contacted: ["meeting_booked", "nurture", "disqualified"],
  meeting_booked: ["qualified", "contacted", "nurture", "disqualified"],
  qualified: ["disqualified"],
  disqualified: ["new"],
  nurture: ["contacted", "disqualified"],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}

/** The statuses a lead in `from` may move to, in the order the UI lists them. */
export function nextStatuses(from: LeadStatus): readonly LeadStatus[] {
  return LEAD_TRANSITIONS[from];
}

/** A lead that is no longer being worked, one way or the other. */
export const CLOSED_STATUSES: readonly LeadStatus[] = ["qualified", "disqualified"];

export function isClosedStatus(status: LeadStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

// ---------------------------------------------------------------------------
// Disqualification

export const DISQUALIFY_REASONS = [
  "not_icp",
  "no_budget",
  "no_authority",
  "no_pain",
  "competitor",
  "bad_contact_info",
  "unresponsive",
  "already_customer",
  "other",
] as const;

export type DisqualifyReason = (typeof DISQUALIFY_REASONS)[number];

export function isDisqualifyReason(value: unknown): value is DisqualifyReason {
  return typeof value === "string" && (DISQUALIFY_REASONS as readonly string[]).includes(value);
}

export const DISQUALIFY_REASON_LABELS: Record<DisqualifyReason, string> = {
  not_icp: "Not our ideal customer",
  no_budget: "No budget",
  no_authority: "No authority to buy",
  no_pain: "No real pain",
  competitor: "Went with a competitor",
  bad_contact_info: "Bad contact info",
  unresponsive: "Unresponsive",
  already_customer: "Already a customer",
  other: "Other",
};

// ---------------------------------------------------------------------------
// Activity

export const LEAD_ACTIVITY_TYPES = [
  "status_change",
  "assigned",
  "unassigned",
  "note",
  "crm_push",
] as const;

export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];
