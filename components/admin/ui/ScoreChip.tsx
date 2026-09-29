import { cn } from "@/lib/utils";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { EMPTY_VALUE } from "@/lib/format";
import { bg, radius, text } from "./tokens";

/** The top band: the accent fill. */
const TOP_MIN = 9;

/**
 * Every score in admin, in mono.
 *
 * A lead score is banded by fill: 9 and up takes the accent, 7 and 8 the
 * tinted accent, anything lower the neutral track. 7 is the threshold the
 * rest of the product acts on (lib/leads.ts). `variant="fit"` is always
 * neutral, so a row of two chips reads as one score and one supporting
 * number rather than two competing ones.
 *
 * The number always renders. An unscored row shows the empty glyph on no
 * ground, so it is visibly empty rather than quietly low.
 */
export function ScoreChip({
  score,
  variant = "score",
  size = "default",
  className,
}: {
  score: number | null | undefined;
  variant?: "score" | "fit";
  /** default is the 32 by 28 table chip, sm a 28 by 24 one, hero the 56px tile on a lead page. */
  size?: "default" | "sm" | "hero";
  className?: string;
}) {
  const noun = variant === "fit" ? "Fit score" : "Lead score";
  const box =
    size === "hero"
      ? cn("h-[56px] w-[56px] text-[26px]", radius.card)
      : size === "sm"
        ? cn("h-[24px] w-[28px] text-[12px]", radius.chip)
        : cn("h-[28px] w-[32px]", radius.chip);

  if (score === null || score === undefined || Number.isNaN(score)) {
    return (
      <span
        aria-label={`No ${noun.toLowerCase()} yet`}
        className={cn("ds-mono-chip inline-flex shrink-0 items-center justify-center", box, text.muted3, className)}
      >
        {EMPTY_VALUE}
      </span>
    );
  }

  const tone =
    variant === "fit" || score < WORTH_A_CALL_SCORE_MIN
      ? cn(bg.track, text.ink3)
      : score >= TOP_MIN
        ? cn(bg.accent, text.onInk)
        : cn(bg.accentWeak, text.accent);

  return (
    <span
      aria-label={`${noun} ${score} of 10`}
      className={cn("ds-mono-chip inline-flex shrink-0 items-center justify-center", box, tone, className)}
    >
      {score}
    </span>
  );
}
