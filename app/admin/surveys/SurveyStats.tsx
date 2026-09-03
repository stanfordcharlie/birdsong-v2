import { StatRow } from "@/components/admin/ui";
import { formatPercent } from "@/lib/format";

export type SurveyStatsData = {
  responsesThisWeek: number;
  /** Change vs the previous seven days, 0-1 scale. Null with no prior week. */
  weekDelta: number | null;
  responsesTotal: number;
  /** 0-1, completed / started. Null when nothing has been started. */
  completionRate: number | null;
};

/**
 * Three numbers, one bar. "Best performer" is gone: a stat value is a number,
 * and the table below already ranks by response count.
 */
export function SurveyStats({ stats }: { stats: SurveyStatsData }) {
  const delta =
    stats.weekDelta !== null && stats.weekDelta !== 0
      ? `${stats.weekDelta > 0 ? "+" : ""}${Math.round(stats.weekDelta * 100)}% vs prior week`
      : undefined;

  return (
    <StatRow
      stats={[
        { label: "Responses this week", value: stats.responsesThisWeek, delta },
        { label: "Responses", value: stats.responsesTotal },
        { label: "Completion rate", value: formatPercent(stats.completionRate) },
      ]}
    />
  );
}
