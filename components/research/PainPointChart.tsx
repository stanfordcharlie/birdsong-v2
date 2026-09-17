import type { BarChartData } from "@/lib/reports/chart-data";

/**
 * Pain-point frequency as horizontal bars inside one card. Each bar is drawn
 * against the respondent count (not the largest value), so a bar's length
 * is literally the share of people who raised it, and the count rides the
 * row as a direct label. One hue, no legend: length is the only encoding.
 */
export function PainPointChart({ data }: { data: BarChartData }) {
  return (
    <figure className="m-0 rounded-2xl border border-landing-border bg-landing-surface px-10 py-9 lp-mobile:px-6">
      <ul className="m-0 flex list-none flex-col gap-7 p-0">
        {data.bars.map((bar) => {
          const share = bar.value / data.total;
          return (
            <li key={bar.label}>
              <div className="mb-3 flex items-baseline justify-between gap-6">
                <span className="text-[17.5px] font-medium leading-[1.4] text-landing-ink">{bar.label}</span>
                <span className="shrink-0 font-mono text-[16px] font-medium text-landing-ink">{bar.value}</span>
              </div>
              <div
                className="h-[18px] overflow-hidden rounded-[3px] bg-landing-hair"
                role="img"
                aria-label={`${bar.label}: ${bar.value} of ${data.total} respondents`}
              >
                <span
                  className="block h-full rounded-[3px] bg-landing-green-deep"
                  style={{ width: `${Math.max(2, share * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-8 border-t border-landing-hair pt-5 text-[15px] leading-[1.6] text-landing-faint">
        {data.caption}
      </figcaption>
    </figure>
  );
}
