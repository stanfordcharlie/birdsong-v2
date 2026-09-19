// Shared between the public survey page (app/study/[slug]/page.tsx, which
// sanitizes ?src= before it's ever passed into the client bundle) and
// /api/interview/start (which re-sanitizes independently — the page's
// cleaning is UX only, a direct caller could send anything). Lets survey
// distributors tag which channel a link was shared through (in-app popup,
// an email blast, paid ads, ...) so it can be broken down later.
export const SOURCE_MAX_LENGTH = 50;

// The value /api/interview/start writes when a response is created from a
// prospect's personal token link. Assigned by the server, never by ?src=:
// a token proves the person was reached by outbound, a query string only
// says what someone typed. Reserved so an anonymous ?src=outbound cannot
// pose as the system row (see reserveSystemSources).
export const OUTBOUND_SOURCE = "outbound";

/** True for the sources Birdsong assigns itself rather than an admin's tag. */
export function isSystemSource(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === OUTBOUND_SOURCE;
}

const DISALLOWED_SOURCE_CHARS = /[^a-zA-Z0-9_-]/g;

// Strips anything outside [A-Za-z0-9_-] rather than rejecting the whole
// value, then caps length. A non-string input, or one that sanitizes down
// to nothing, becomes null — same as the default for organic/untagged
// traffic with no ?src= at all.
export function sanitizeSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(DISALLOWED_SOURCE_CHARS, "").slice(0, SOURCE_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

// Anonymous traffic keeps whatever it was tagged with, except the one value
// the server reserves for itself. Case-folded, so "Outbound" cannot slip in
// as a lookalike.
export function reserveSystemSources(value: string | null): string | null {
  return isSystemSource(value) ? null : value;
}
