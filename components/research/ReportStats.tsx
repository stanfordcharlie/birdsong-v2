import type { ReportStat } from "@/lib/reports/chart-data";

/**
 * The KPI band directly under the hero: four counted figures, each with a
 * lighter suffix where the figure has a denominator or a unit. A stat row,
 * not a chart: these share no scale.
 */
export function ReportStats({ stats }: { stats: ReportStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="border-y border-landing-hair bg-landing-surface">
      <div className="mx-auto grid max-w-[1480px] grid-cols-4 gap-12 px-6 py-14 md:px-10 lp-stack:grid-cols-2 lp-stack:gap-10 lp-mobile:grid-cols-1">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={i === 0 ? undefined : "border-l border-landing-hair pl-12 lp-stack:border-l-0 lp-stack:pl-0"}
          >
            <div className="font-bricolage text-[clamp(44px,4.2vw,60px)] font-bold leading-none tracking-[-0.04em] text-landing-green-deep">
              {stat.figure}
              {stat.suffix && (
                <span className="text-[0.55em] font-bold tracking-[-0.02em] text-landing-green/70">
                  {stat.suffix}
                </span>
              )}
            </div>
            <div className="mt-4 max-w-[26ch] text-[16.5px] leading-[1.5] text-landing-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
