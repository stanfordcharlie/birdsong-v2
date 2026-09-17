import type { BarChartData } from "@/lib/reports/chart-data";

/**
 * Issue frequency, as a hard-shadowed chart card.
 *
 * Two things are deliberate. Fill width is count/total, not count/max — the
 * claim each bar makes is "N of the people we interviewed", so the track has
 * to be the whole set or a 4-of-16 issue would draw at 40% and read as a
 * near-majority. And colour is by rank, not by value: the top two are the
 * primary green, the next four a mid green, the tail sage, so the eye sorts
 * the list before it reads a single label.
 */
function fillColour(rank: number): string {
  if (rank < 2) return "bg-ln-green";
  if (rank < 6) return "bg-ln-green-mid";
  return "bg-ln-sage";
}

export function FrequencyChart({ data }: { data: BarChartData }) {
  return (
    <div className="grid gap-[22px] border-[2.5px] border-ln-ink bg-white px-[24px] pb-[32px] pt-[28px] shadow-[10px_10px_0_var(--ln-ink)] sm:px-[36px] sm:pt-[36px]">
      {data.bars.map((bar, i) => (
        <div key={bar.label} className="grid gap-[8px]">
          <div className="flex justify-between gap-[16px] text-[16px] leading-[1.35]">
            <span>{bar.label}</span>
            <strong className="flex-none font-jakarta">{bar.value}</strong>
          </div>
          <div className="h-[16px] bg-[#F0EBE0]">
            <div
              style={{ width: `${(bar.value / data.total) * 100}%` }}
              className={`h-[16px] ${fillColour(i)}`}
            />
          </div>
        </div>
      ))}
      <div className="border-t-[1.5px] border-ln-card-border pt-[6px] text-[14px] text-ln-muted">
        {data.caption}
      </div>
    </div>
  );
}
