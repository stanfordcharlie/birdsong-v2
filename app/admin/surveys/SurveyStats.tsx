import Link from "next/link";
import { StatRow } from "@/components/admin/ui";
import { formatPercent } from "@/lib/format";

export type SurveyStatsData = {
  responsesThisWeek: number;
  /** Change vs the previous seven days, 0-1 scale. Null with no prior week. */
  weekDelta: number | null;
  /** Seven counts, oldest first. */
  responsesByDay: number[];
  /** 0-1, completed / started. Null when nothing has been started. */
  completionRate: number | null;
  bestPerformer: { id: string; title: string; responseCount: number } | null;
};

/**
 * The three detached cards this page used to render, each with its own chrome
 * (a sparkline, a completion ring, an icon tile), are now cells of the one
 * shared StatRow. The chrome is gone deliberately: it was three different
 * ways of decorating a number, and none of the three appeared on any other
 * page, which is most of why Surveys and Home read as separate products.
 *
 * What the chrome carried that was real is kept as `hint` text: the
 * week-over-week delta and the "of starts finish" qualifier.
 */
export function SurveyStats({ stats }: { stats: SurveyStatsData }) {
  return (
    <StatRow
      stats={[
        {
          label: "Responses this week",
          value: stats.responsesThisWeek,
          hint:
            stats.weekDelta !== null && stats.weekDelta !== 0 ? (
              <span className={stats.weekDelta > 0 ? "font-semibold text-brand" : "text-muted-foreground"}>
                {stats.weekDelta > 0 ? "+" : ""}
                {Math.round(stats.weekDelta * 100)}%
              </span>
            ) : undefined,
        },
        {
          label: "Completion rate",
          value: formatPercent(stats.completionRate),
          hint: stats.completionRate === null ? undefined : "of starts finish",
        },
        // Omitted rather than shown empty: on a new account there is no best
        // performer, and an empty cell reads as something that failed to load.
        ...(stats.bestPerformer
          ? [
              {
                label: "Best performer",
                value: (
                  <Link href={`/admin/surveys/${stats.bestPerformer.id}`} className="focus-ring hover:underline">
                    {stats.bestPerformer.responseCount}
                  </Link>
                ),
                hint: stats.bestPerformer.title,
              },
            ]
          : []),
      ]}
    />
  );
}
