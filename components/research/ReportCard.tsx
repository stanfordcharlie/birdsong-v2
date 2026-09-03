import Link from "next/link";
import type { PublicReport } from "@/lib/reports/public";
import { painPointChart } from "@/lib/reports/chart-data";
import { formatPublishDate, isoDate } from "@/lib/reports/format";

/**
 * One report in the library index.
 *
 * The hero visual is the report's own top pain-point bars, drawn from the
 * same painPointChart() the full page uses, so a card can never show a
 * different shape from the chart it links to. When a report has no
 * quantitative series, the card falls back to its first key finding set as
 * display text, which is the other thing worth reading at a glance.
 */
export function ReportCard({ report }: { report: PublicReport }) {
  const chart = painPointChart(report.content, report.respondentCount, { limit: 3 });
  const firstFinding = report.content.takeaways?.[0];

  return (
    <Link
      href={`/reports/${report.slug}`}
      className="lp-lift group flex flex-col overflow-hidden rounded-2xl border border-landing-border bg-landing-surface no-underline"
    >
      {/* Hero visual */}
      <div className="border-b border-landing-hair bg-landing-sunk px-7 py-7">
        {chart ? (
          <div className="flex flex-col gap-3.5">
            {chart.bars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="line-clamp-1 text-[13.5px] font-medium text-landing-ink">
                    {bar.label}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-landing-green">
                    {bar.value}/{chart.total}
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-landing-hair">
                  <div
                    className="h-full rounded-full bg-landing-green"
                    style={{ width: `${Math.max(4, bar.ratio * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 line-clamp-4 font-spectral text-[17px] italic leading-[1.5] text-landing-ink">
            {firstFinding ?? report.dek}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col px-7 pb-7 pt-6">
        {report.sponsor && (
          <div className="mb-3 text-[12px] font-semibold tracking-[0.11em] text-landing-faint">
            {report.sponsor.toUpperCase()}
          </div>
        )}
        <h2 className="m-0 font-bricolage text-[20px] font-bold leading-[1.22] tracking-[-0.012em] text-landing-ink">
          {report.title}
        </h2>
        <p className="m-0 mt-3 line-clamp-3 text-[15px] leading-[1.55] text-landing-muted">
          {report.dek}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] text-landing-faint">
          <span>n = {report.respondentCount}</span>
          <span aria-hidden>·</span>
          <time dateTime={isoDate(report.publishedAt)}>
            {formatPublishDate(report.publishedAt)}
          </time>
        </div>
      </div>
    </Link>
  );
}
