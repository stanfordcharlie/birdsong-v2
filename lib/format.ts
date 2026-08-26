// Shared display formatting for the admin surface.
//
// Replaces lib/format-relative-time.ts (same function, tightened thresholds)
// and LiveBoard's private formatSince, which had drifted into a second
// relative-time formatter with its own units.

/**
 * The one glyph admin renders for "this cell has no value".
 *
 * Centralised because it was being typed inline as a literal in a dozen
 * places, and a mix of "—", "-", "n/a" and "" across columns reads as data
 * that means different things when it does not. This is the documented
 * exception to the no-em-dashes rule: it is a typographic mark standing in
 * for a missing value, not prose.
 */
export const EMPTY_VALUE = "—";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Relative time for admin timestamps.
 *
 * Thresholds are stated as one ordered ladder with no gaps and no overlap, so
 * two rows of similar age can never land on different units. The previous
 * implementation ran weeks to `< 5` and then computed months as `days / 30`,
 * which put `4w ago` and `1mo ago` a single day apart in the same column.
 * Weeks now stop at 4 and months begin at 28 days, so each magnitude has
 * exactly one spelling.
 *
 * `seconds: true` opts into a sub-minute band for the Live board, where
 * seconds are the unit that matters and "Just now" for a full minute hides
 * the thing the page exists to show. Everywhere else the ladder starts at
 * "Just now", because a lead that arrived 40 seconds ago and one that
 * arrived 20 seconds ago are the same event to a rep.
 */
export function formatRelativeTime(
  input: string | number | Date,
  options: { seconds?: boolean } = {}
): string {
  const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (Number.isNaN(then)) return EMPTY_VALUE;

  // Clamped rather than trusted into a negative age: a future timestamp comes
  // from clock skew between the server and the browser, not from the future.
  const diffMs = Math.max(0, Date.now() - then);

  if (options.seconds) {
    const seconds = Math.round(diffMs / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
  } else if (diffMs < MINUTE_MS) {
    return "Just now";
  }

  const minutes = Math.floor(diffMs / MINUTE_MS);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diffMs / HOUR_MS);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diffMs / DAY_MS);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  // 7-27 days is weeks (1w, 2w, 3w); 28 days is where months start. No value
  // is expressible in both units.
  if (days < 28) return `${Math.floor(days / 7)}w ago`;

  const months = Math.floor(days / 30.44);
  if (months < 12) return `${Math.max(1, months)}mo ago`;

  return `${Math.floor(days / 365.25)}y ago`;
}

/** An absolute date for places where "when exactly" is the question. */
export function formatDate(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Renders a 0-1 ratio as a whole percent, or the empty glyph when unknown. */
export function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return EMPTY_VALUE;
  return `${Math.round(ratio * 100)}%`;
}
