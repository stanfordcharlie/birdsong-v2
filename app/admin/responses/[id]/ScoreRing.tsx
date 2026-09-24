import { cn } from "@/lib/utils";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { EMPTY_VALUE } from "@/lib/format";

// A 1-10 score as a ring with the digit in the middle, for the two scores at
// the top of the response detail page. The ring is the same reading as
// ScoreBadge's fill, at the size the page's first card needs: 7+ takes the
// accent, anything below takes the amber the mockup drew, so a 5 reads as
// "not there yet" rather than as a flat grey nothing. An unscored ring is an
// empty track with the empty glyph in it.
//
// Geometry is written in px on purpose (see DESIGN.md, decisions log): a
// ring drawn in rem changes size with the visitor's browser font setting
// while the SVG stroke inside it does not.

const SIZE = 60;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({
  score,
  label,
  note,
  className,
}: {
  score: number | null;
  label: string;
  /** One short qualifier under the label, e.g. "low confidence". */
  note?: string | null;
  className?: string;
}) {
  const scored = score !== null && !Number.isNaN(score);
  const clamped = scored ? Math.min(10, Math.max(0, score)) : 0;
  const hot = scored && clamped >= WORTH_A_CALL_SCORE_MIN;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          aria-hidden
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-border"
          />
          {scored && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 10)}
              className={hot ? "stroke-brand" : "stroke-warning"}
            />
          )}
        </svg>
        <span
          aria-label={scored ? `${label} ${score} of 10` : `No ${label.toLowerCase()} yet`}
          className={cn(
            "absolute inset-0 flex items-center justify-center font-archivo text-[20px] font-medium tabular-nums",
            scored ? "text-card-foreground" : "text-muted-foreground"
          )}
        >
          {scored ? score : EMPTY_VALUE}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-archivo text-[14px] leading-[1.3] text-muted-foreground">{label}</span>
        {note && <span className="font-archivo text-[12px] leading-[1.3] text-faint">{note}</span>}
      </div>
    </div>
  );
}
