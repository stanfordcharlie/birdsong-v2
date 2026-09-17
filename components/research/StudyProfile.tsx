import type { HeadlineStat } from "@/lib/reports/chart-data";

export type ProfileRow = { label: string; value: string };

/**
 * The study profile card beside the hero: the facts of the study as a ruled
 * list in mono figures, then the top issue as one filled bar. Every value is
 * read from the study or counted from the report; nothing is estimated.
 */
export function StudyProfile({ rows, headline }: { rows: ProfileRow[]; headline: HeadlineStat | null }) {
  const share = headline ? Math.max(0.04, parseInt(headline.percent, 10) / 100) : 0;
  return (
    <aside className="rounded-2xl border border-landing-border bg-landing-surface px-8 py-7">
      <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.2em] text-landing-muted">
        Study profile
      </div>
      <dl className="m-0 mt-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-6 border-b border-landing-hair py-4 last:border-b-0"
          >
            <dt className="text-[16.5px] text-landing-ink-soft">{row.label}</dt>
            <dd className="m-0 text-right font-mono text-[15.5px] font-medium text-landing-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {headline && (
        <div className="mt-6 border-t border-landing-border pt-6">
          <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.2em] text-landing-muted">
            Top issue
          </div>
          <div
            className="mt-4 flex h-[10px] overflow-hidden rounded-full bg-landing-hair"
            role="img"
            aria-label={`${headline.figure} respondents raised ${headline.label}`}
          >
            <span className="h-full rounded-full bg-landing-green" style={{ width: `${share * 100}%` }} />
          </div>
          <div className="mt-3 flex items-start justify-between gap-4 text-[15px] leading-[1.5]">
            <span className="text-landing-ink-soft">{headline.label}</span>
            <span className="shrink-0 font-mono font-medium text-landing-ink">{headline.figure}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
