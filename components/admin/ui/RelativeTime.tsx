import { cn } from "@/lib/utils";
import { EMPTY_VALUE, formatAbsolute, formatRelativeTime } from "@/lib/format";

/**
 * Every timestamp admin shows a person.
 *
 * The visible text is always relative, because the question a table asks is
 * "how stale is this row", not "what was the date". The absolute value is
 * still there, in the tooltip and in `dateTime`, for the one time in fifty
 * that the exact stamp is the question. That split is why the study detail
 * page's raw browser-locale timestamp column is gone: it printed
 * "8/24/2026, 3:17:53 PM" in a wide cell, which is neither scannable nor
 * precise enough to be worth the width.
 *
 * `suppressHydrationWarning` because the text is computed from Date.now(),
 * which can land on either side of a minute boundary between the server
 * render and hydration.
 */
export function RelativeTime({
  date,
  align = "left",
  prefix,
  className,
}: {
  date: string | Date;
  align?: "left" | "right";
  /** A muted word before the value, e.g. "started". Never the value itself. */
  prefix?: string;
  className?: string;
}) {
  const parsed = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return <span className={cn("text-muted-foreground", className)}>{EMPTY_VALUE}</span>;
  }

  return (
    <time
      dateTime={parsed.toISOString()}
      title={formatAbsolute(parsed)}
      suppressHydrationWarning
      className={cn(align === "right" && "block text-right", className)}
    >
      {prefix && <span className="text-faint">{prefix} </span>}
      {formatRelativeTime(parsed)}
    </time>
  );
}
