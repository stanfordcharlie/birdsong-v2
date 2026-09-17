import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "@/lib/format";

/**
 * Every lead score in admin.
 *
 * One encoding for one data type. Before this, a 1-10 score rendered as a
 * meter bar plus a number on the Leads queue and as a flat grey pill on the
 * study detail page, so the same 8 looked like two different measurements
 * depending on which page you opened. The bar is gone: a column of bars is a
 * second reading of a number that is already right there.
 *
 * The number always renders. Tier is carried by the fill, not by the
 * presence of the value, so an unscored row is visibly empty rather than
 * quietly low.
 */

/** The accent band. Matches lib/leads.ts's WORTH_A_CALL_SCORE_MIN by intent. */
const HOT_MIN = 7;

export function ScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number | null | undefined;
  /** md is h-7 (tables, detail pages). sm is h-6, for dense inline contexts. */
  size?: "sm" | "md";
  className?: string;
}) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return (
      <span
        aria-label="No lead score yet"
        className={cn("font-archivo text-count tabular-nums text-muted-foreground", className)}
      >
        {EMPTY_VALUE}
      </span>
    );
  }

  // 7-10 carries the accent so a hot column is scannable without reading a
  // digit. 5-6 takes the neutral fill and muted ink Badge's default variant
  // already uses, and 1-4 takes that same fill with the same muted text
  // token, so the two lower bands render identically and the digit is what
  // separates them. No third fill is invented for a distinction the number
  // already makes.
  const hot = score >= HOT_MIN;

  return (
    <span
      aria-label={`Lead score ${score} of 10`}
      className={cn(
        "inline-flex items-center justify-center rounded-pill font-archivo text-count font-semibold tabular-nums",
        size === "md" ? "h-7 w-7" : "h-6 w-6",
        hot ? "bg-brand-weak text-brand-text" : "bg-chip text-muted-foreground",
        className
      )}
    >
      {score}
    </span>
  );
}
