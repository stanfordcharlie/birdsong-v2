/**
 * Date formatting for the public library.
 *
 * Fixed to UTC and to en-US: these strings are baked into statically
 * generated HTML at build time, so a locale- or timezone-dependent format
 * would render whatever the build machine happened to be set to and could
 * differ from the same date rendered anywhere else.
 */

export function formatPublishDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Machine-readable YYYY-MM-DD for <time datetime> and JSON-LD. */
export function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** "Sep 2026", for the mono kicker beside the report number. */
export function formatPublishMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
