import type { ChartBar } from "@/lib/reports/chart-data";

export type ProfileRow = { label: string; value: string };

/**
 * The sticker card beside the report title: the study's shape in four or
 * five rows, then the single most-raised issue as a progress bar.
 *
 * Rows are passed in rather than derived here because which ones exist
 * depends on the report — roles and company size are optional columns, and
 * the issue count only means anything when there is a frequency chart.
 */
export function StudyProfileCard({
  rows,
  topIssue,
  total,
}: {
  rows: ProfileRow[];
  topIssue: ChartBar | null;
  total: number;
}) {
  return (
    <div className="relative w-full min-w-0 max-w-[440px] border-[2.5px] border-ln-ink bg-white px-[24px] pb-[36px] pt-[32px] shadow-[10px_10px_0_var(--ln-sage)] sm:px-[32px] lg:justify-self-end">
      <div
        aria-hidden="true"
        className="absolute -top-[22px] right-[28px] flex size-[56px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-ln-logo-cream"
      >
        <div
          style={{
            clipPath:
              "polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)",
          }}
          className="size-[30px] bg-ln-green"
        />
      </div>

      <div className="mb-[18px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green">
        Study profile
      </div>
      <div className="grid text-[17px]">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex justify-between gap-[16px] border-t-[1.5px] border-ln-card-border py-[14px] ${
              i === rows.length - 1 ? "border-b-[1.5px]" : ""
            }`}
          >
            <span className="text-ln-body">{row.label}</span>
            <strong className="text-right font-jakarta">{row.value}</strong>
          </div>
        ))}
      </div>

      {topIssue && (
        <>
          <div className="mb-[12px] mt-[28px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green">
            Top issue
          </div>
          {/* Width is the count over the interview total, not over the
              largest bar: this one reads as "10 of 16 people", so the track
              has to be the whole set. */}
          <div className="h-[14px] bg-ln-rule">
            <div
              style={{ width: `${(topIssue.value / total) * 100}%` }}
              className="h-[14px] bg-ln-green"
            />
          </div>
          <div className="mt-[12px] flex justify-between gap-[16px] text-[15px] leading-[1.4]">
            <span className="text-ln-body">{topIssue.label}</span>
            <strong className="whitespace-nowrap font-jakarta">
              {topIssue.value} of {total}
            </strong>
          </div>
        </>
      )}
    </div>
  );
}
