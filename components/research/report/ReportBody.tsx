import { MaterialIcon } from "@/components/marketing/green/MaterialIcon";
import type { ReportQuote, ReportTheme } from "@/lib/report/generate";
import type { ReportStat } from "@/lib/reports/chart-data";

/** The bordered strip of headline numbers under the title block. */
export function StatStrip({ stats }: { stats: ReportStat[] }) {
  return (
    <div className="border-y-2 border-ln-ink bg-white">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-[16px] px-[20px] py-[40px] sm:px-[32px]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="min-w-0 border-[1.5px] border-ln-card-border px-[24px] pb-[30px] pt-[28px] sm:px-[28px]"
          >
            <div className="font-jakarta text-[56px] font-extrabold leading-none tracking-[-0.03em] text-ln-green sm:text-[64px]">
              {stat.figure}
              {stat.suffix && <span className="text-[32px] text-ln-ink">{stat.suffix}</span>}
            </div>
            <div className="mt-[14px] text-[18px] leading-[1.4] text-ln-body">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The executive summary's pulled-out figure.
 *
 * Renders only when the report has a counted headline. There is no fallback
 * number: every figure on this page is counted from the interviews, and an
 * estimated one in the loudest position on the page would be the one place
 * that stops being true.
 */
export function SummaryCallout({ percent, label }: { percent: string; label: string }) {
  return (
    <div className="max-w-[380px] border-[2.5px] border-ln-ink bg-ln-green px-[28px] py-[36px] text-white shadow-[10px_10px_0_var(--ln-green-pale)] sm:px-[36px] sm:py-[40px]">
      <div className="font-jakarta text-[64px] font-extrabold leading-none tracking-[-0.04em] sm:text-[80px]">
        {percent}
      </div>
      <div className="mt-[18px] text-[19px] leading-[1.45]">of respondents raised {label}</div>
    </div>
  );
}

/** The numbered takeaway cards. */
export function KeyFindings({ takeaways }: { takeaways: string[] }) {
  return (
    <div className="grid gap-[14px]">
      {takeaways.map((takeaway, i) => (
        <div
          key={takeaway}
          className="flex gap-[16px] border-[1.5px] border-ln-card-border bg-white px-[24px] py-[28px] sm:gap-[24px] sm:px-[32px]"
        >
          <span className="flex-none pt-[5px] font-jakarta text-[15px] font-extrabold tracking-[0.1em] text-ln-green">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="m-0 text-[19px] leading-[1.5] text-ln-body">{takeaway}</p>
        </div>
      ))}
    </div>
  );
}

/** One theme: numbered disc, heading, paragraph, and its evidence bullets. */
export function ThemeCards({ themes }: { themes: ReportTheme[] }) {
  return (
    <div className="grid gap-[20px]">
      {themes.map((theme, i) => (
        <div
          key={theme.heading}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[20px] border-[1.5px] border-ln-card-border bg-white px-[24px] py-[28px] sm:gap-[28px] sm:px-[40px] sm:py-[36px]"
        >
          <div className="flex size-[48px] items-center justify-center rounded-full border-2 border-ln-ink bg-ln-green-pale font-jakarta text-[20px] font-extrabold sm:size-[56px] sm:text-[22px]">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="min-w-0">
            <h3 className="m-0 mb-[16px] mt-[8px] text-pretty font-jakarta text-[26px] font-bold leading-[1.2] tracking-[-0.015em]">
              {theme.heading}
            </h3>
            <p className="m-0 mb-[22px] text-pretty text-[18px] leading-[1.55] text-ln-body">
              {theme.paragraph}
            </p>
            {(theme.supporting_points ?? []).length > 0 && (
              <>
                <div className="mb-[10px] font-jakarta text-[12px] font-semibold uppercase tracking-[0.18em] text-ln-green">
                  Evidence
                </div>
                <div className="grid gap-[10px]">
                  {theme.supporting_points.map((point) => (
                    <div key={point} className="flex gap-[14px] text-[16px] leading-[1.45] text-ln-body">
                      <span
                        aria-hidden="true"
                        className="mt-[8px] size-[8px] flex-none rounded-full bg-ln-green"
                      />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Verbatim quotes, as sticker cards. */
export function QuoteGrid({ quotes }: { quotes: ReportQuote[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[24px]">
      {quotes.map((quote) => (
        <div
          key={quote.quote}
          className="flex min-w-0 flex-col gap-[18px] border-2 border-ln-ink bg-white px-[28px] pb-[26px] pt-[28px] shadow-[6px_6px_0_var(--ln-ink)]"
        >
          <MaterialIcon name="format_quote" className="text-[32px] text-ln-green" />
          <div className="flex-1 text-pretty font-jakarta text-[19px] font-semibold leading-[1.35] tracking-[-0.01em]">
            {quote.quote}
          </div>
          <div className="border-t-[1.5px] border-ln-card-border pt-[14px] text-[14px] leading-[1.4] text-ln-muted">
            {quote.attribution}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The three labelled facts under the methodology prose. */
export function MethodologyMeta({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="grid max-w-[680px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[16px]">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-[1.5px] border-ln-card-border bg-white px-[22px] py-[20px]"
        >
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ln-muted">
            {item.label}
          </div>
          <div className="mt-[6px] font-jakarta text-[18px] font-bold">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

/** The sponsor's initial in a disc, beside their name. */
export function SponsorMark({ sponsor }: { sponsor: string }) {
  return (
    <span className="flex items-center gap-[8px]">
      <span
        aria-hidden="true"
        className="inline-flex size-[26px] flex-none items-center justify-center rounded-full bg-ln-green text-[13px] font-normal text-white"
      >
        {sponsor.trim().charAt(0).toUpperCase()}
      </span>
      {sponsor}
    </span>
  );
}
