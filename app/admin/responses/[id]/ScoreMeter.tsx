import { cn } from "@/lib/utils";

// The two score cards at the top of the response detail page: a label, the
// score as a fraction, and a bar. Lead score and company fit are read
// side by side and constantly compared, so they share one component rather
// than two near-identical blocks that can drift apart.
//
// `tone` is the bar's fill, not a judgment of the number: lead score is
// always the green track, company fit always the amber one, so a reader can
// tell the two meters apart at a glance without reading the labels.
export function ScoreMeter({
  label,
  score,
  tone,
  badge,
  children,
}: {
  label: string;
  /** Out of 10, or null when the score was never produced. */
  score: number | null;
  tone: "lead" | "fit";
  /** Optional qualifier beside the label, e.g. a confidence chip. */
  badge?: React.ReactNode;
  /** Reasoning and any reveal, rendered under the bar. */
  children?: React.ReactNode;
}) {
  const hasScore = score !== null;
  const percent = hasScore ? Math.max(0, Math.min(10, score)) * 10 : 0;

  return (
    <div className="flex flex-col rounded-card border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-section-label">{label}</span>
          {badge}
        </div>
        <div className="shrink-0 tabular-nums">
          {hasScore ? (
            <>
              <span className="text-2xl font-semibold text-card-foreground">{score}</span>
              <span className="text-sm text-faint">/10</span>
            </>
          ) : (
            <span className="text-sm text-faint">Not scored</span>
          )}
        </div>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-pill bg-secondary"
        // The bar is a redundant view of the number right beside it, so it is
        // decorative to a screen reader rather than a second announcement.
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-full rounded-pill",
            tone === "lead" ? "bg-success" : "bg-warning",
            !hasScore && "hidden"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {children && <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}
