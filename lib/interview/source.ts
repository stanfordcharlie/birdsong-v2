// Shared between the public survey page (app/survey/[slug]/page.tsx, which
// sanitizes ?src= before it's ever passed into the client bundle) and
// /api/interview/start (which re-sanitizes independently — the page's
// cleaning is UX only, a direct caller could send anything). Lets survey
// distributors tag which channel a link was shared through (in-app popup,
// an email blast, paid ads, ...) so it can be broken down later.
export const SOURCE_MAX_LENGTH = 50;

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
