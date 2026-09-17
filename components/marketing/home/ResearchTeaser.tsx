import Link from "next/link";
import { painPointChart } from "@/lib/reports/chart-data";
import { formatPublishMonthLong } from "@/lib/reports/format";
import type { PublicReport } from "@/lib/reports/public";
import { PillLink } from "../green/PillLink";

// The bar palette, cycled in order. Four bars is what the card has room for
// under the headline stat.
const BAR_COLOURS = ["bg-ln-green", "bg-ln-green-mid", "bg-ln-green", "bg-ln-sage"];

/**
 * The published-research band: the pitch on the left, the newest study on
 * the right as a linked sticker card.
 *
 * Driven by the real library rather than the design's hardcoded example, so
 * the card always points at a study that exists and its numbers cannot
 * drift from the report page they link to. The design's own figures
 * ("10 / 16", the four bar widths) are the pain-point chart the report page
 * draws from the same helper, which is why they are read through
 * painPointChart here instead of being transcribed.
 *
 * Renders nothing when nothing has published — the section is the one place
 * a visitor can check the claim above it, and an empty version of it makes
 * the claim worse, not better. That is also the handoff's `showResearch`
 * switch, resolved from data instead of a flag.
 */
export function ResearchTeaser({ report }: { report: PublicReport | null }) {
  if (!report) return null;

  const chart = painPointChart(report.content, report.respondentCount, { limit: 4 });
  const top = chart?.bars[0];
  const eyebrow = [report.sponsor, formatPublishMonthLong(report.publishedAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <section id="research" className="bg-white px-[20px] py-[64px] sm:px-[32px] sm:py-[96px]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[48px]">
        <div className="min-w-0">
          <p className="m-0 font-jakarta text-[15px] font-semibold uppercase tracking-[0.2em] text-ln-green">
            Published research
          </p>
          <h2 className="m-0 mb-[18px] mt-[14px] text-pretty font-jakarta text-[clamp(34px,4.2vw,58px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
            The interviews become published research.
          </h2>
          <p className="m-0 mb-[32px] text-pretty text-[21px] leading-[1.45] text-ln-body">
            Every study we run is written up and published in the open, with the number of
            interviews behind each finding stated on the page.
          </p>
          <PillLink href="/reports" variant="outline" className="px-[32px] py-[14px] text-[18px]">
            Read all research →
          </PillLink>
        </div>

        {/* The sage offset shadow deepens to mid-green on hover — the card's
            only hover affordance, since it is a link with no underline. */}
        <Link
          href={`/reports/${report.slug}`}
          className="group relative block min-w-0 border-[2.5px] border-ln-ink bg-ln-cream p-[28px] text-ln-ink no-underline shadow-[10px_10px_0_var(--ln-sage)] transition-shadow hover:text-ln-ink hover:shadow-[10px_10px_0_var(--ln-green-mid)] sm:p-[36px]"
        >
          <div
            aria-hidden="true"
            className="absolute -right-[26px] -top-[26px] flex size-[110px] items-center justify-center rounded-full bg-ln-green-pale"
          >
            <div
              style={{
                clipPath:
                  "polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)",
              }}
              className="size-[56px] bg-white"
            />
          </div>
          <div className="font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green">
            {eyebrow}
          </div>
          <div className="mb-[24px] mt-[14px] max-w-[460px] text-pretty font-jakarta text-[24px] font-bold leading-[1.25] tracking-[-0.01em]">
            {report.title}
          </div>
          {top && chart && (
            <>
              <div className="font-jakarta text-[56px] font-extrabold leading-none tracking-[-0.03em] text-ln-green">
                {top.value}
                <span className="text-[28px] text-ln-ink"> / {chart.total}</span>
              </div>
              <div className="mt-[8px] text-[17px] leading-[1.4]">{top.label}</div>
              <div className="mt-[22px] grid gap-[6px]">
                {chart.bars.map((bar, index) => (
                  <div
                    key={bar.label}
                    style={{ width: `${bar.percent}%` }}
                    className={`h-[12px] ${BAR_COLOURS[index % BAR_COLOURS.length]}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="mt-[18px] text-[14px] text-ln-muted">
            Findings from {report.respondentCount} interviews
          </div>
        </Link>
      </div>
    </section>
  );
}
