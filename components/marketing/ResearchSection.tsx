import Link from "next/link";
import type { PublicReport } from "@/lib/reports/public";
import { painPointChart } from "@/lib/reports/chart-data";
import { formatPublishDate } from "@/lib/reports/format";

/**
 * The most recent public studies, on the landing page.
 *
 * This is the proof surface: the pitch above it claims Birdsong produces
 * real findings from real interviews, and this is the only place a visitor
 * can check that claim without signing up. It sits directly under the hero
 * metrics for that reason.
 *
 * Renders nothing at all when no study has published. An empty "our
 * research" band reads worse than no band, and the landing page has other
 * proof to lead on.
 */
export function ResearchSection({ reports }: { reports: PublicReport[] }) {
  if (reports.length === 0) return null;

  return (
    <section className="border-b border-landing-hair bg-landing-bg">
      <div className="mx-auto max-w-[1480px] px-6 py-[92px] md:px-10">
        <div
          data-reveal
          className="mb-12 grid grid-cols-[1.1fr_1fr] items-end gap-16 lp-stack:grid-cols-1 lp-stack:gap-6"
        >
          <h2 className="m-0 max-w-[22ch] text-balance font-bricolage text-[clamp(34px,3.4vw,52px)] font-bold leading-[1.06] tracking-[-0.018em]">
            The interviews become{" "}
            <span className="font-normal italic text-landing-green">published research.</span>
          </h2>
          <p className="m-0 mb-2 max-w-[46ch] text-pretty text-[17.5px] leading-[1.62] text-landing-muted">
            Every study we run is written up and published in the open, with the number of
            interviews behind each finding stated on the page.
          </p>
        </div>

        <div data-reveal className="grid grid-cols-3 gap-7 lp-stack:grid-cols-1">
          {reports.map((report) => {
            const chart = painPointChart(report.content, report.respondentCount, { limit: 1 });
            const top = chart?.bars[0];
            return (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className="lp-lift flex flex-col rounded-2xl border border-landing-border bg-landing-surface p-7 no-underline"
              >
                {report.sponsor && (
                  <div className="mb-3.5 text-[12px] font-semibold tracking-[0.11em] text-landing-faint">
                    {report.sponsor.toUpperCase()}
                  </div>
                )}
                <h3 className="m-0 font-bricolage text-[19px] font-bold leading-[1.24] tracking-[-0.012em]">
                  {report.title}
                </h3>
                {top && (
                  <div className="mt-5 border-t border-landing-hair pt-5">
                    <div className="font-bricolage text-[34px] font-bold leading-none tracking-[-0.03em] text-landing-green">
                      {top.value} of {chart!.total}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[14.5px] leading-[1.5] text-landing-muted">
                      {top.label}
                    </div>
                  </div>
                )}
                <div className="mt-auto pt-6 text-[13.5px] text-landing-faint">
                  {formatPublishDate(report.publishedAt)} · {report.respondentCount} interviews
                </div>
              </Link>
            );
          })}
        </div>

        <div data-reveal className="mt-11">
          <Link
            href="/reports"
            className="lp-undl text-[16px] font-medium text-landing-ink no-underline"
          >
            Read all research →
          </Link>
        </div>
      </div>
    </section>
  );
}
