import type { ReportSection } from "@/lib/reports/chart-data";

/**
 * The eyebrow-plus-H2 that opens every body section.
 *
 * The number comes from `reportSections`, which is also what builds the
 * contents rail — so a report missing a section (no quotes, no chart)
 * renumbers both at once rather than leaving a gap in one of them.
 */
export function ReportSectionHead({
  section,
  title,
  lede,
}: {
  section: ReportSection;
  title: string;
  lede?: string;
}) {
  return (
    <>
      <div className="font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green">
        <span className="mr-[14px] text-ln-muted">{section.number}</span>
        {section.kicker}
      </div>
      <h2
        className={`m-0 mt-[14px] text-pretty font-jakarta text-[clamp(30px,3.4vw,46px)] font-extrabold leading-[1.1] tracking-[-0.025em] ${
          lede ? "mb-[16px]" : "mb-[32px]"
        }`}
      >
        {title}
      </h2>
      {lede && (
        <p className="m-0 mb-[36px] max-w-[640px] text-[19px] leading-[1.5] text-ln-body">{lede}</p>
      )}
    </>
  );
}
