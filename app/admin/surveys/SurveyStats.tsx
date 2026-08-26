import Link from "next/link";
import { cn } from "@/lib/utils";

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

function StatCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card border border-border bg-card px-[22px] py-[18px]", className)}>
      {children}
    </div>
  );
}

// Same bar treatment as the survey cards, one step larger — this is the
// week's shape at a glance, not a chart anyone reads values off.
function WeekBars({ days }: { days: number[] }) {
  const peak = Math.max(...days, 1);
  return (
    <span aria-hidden className="flex h-[34px] items-end gap-[4px]">
      {days.map((count, i) => {
        const ratio = count / peak;
        return (
          <span
            key={i}
            className="w-[7px] shrink-0 rounded-[2px] bg-card-foreground"
            style={{
              height: `${Math.max(4, Math.round(ratio * 34))}px`,
              opacity: 0.18 + ratio * 0.42,
            }}
          />
        );
      })}
    </span>
  );
}

// A ring rather than a bar: completion is a proportion of a whole, and the
// closed shape says that without needing a second reference mark.
function CompletionRing({ rate }: { rate: number }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-chip" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-success"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - rate)}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

export function SurveyStats({ stats }: { stats: SurveyStatsData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StatCard className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted-foreground">Responses this week</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[30px] font-semibold leading-none tracking-[-0.01em] text-card-foreground">
              {stats.responsesThisWeek}
            </span>
            {stats.weekDelta !== null && stats.weekDelta !== 0 && (
              <span
                className={cn(
                  "text-[13px] font-semibold",
                  stats.weekDelta > 0 ? "text-success" : "text-muted-foreground"
                )}
              >
                {stats.weekDelta > 0 ? "+" : ""}
                {Math.round(stats.weekDelta * 100)}%
              </span>
            )}
          </div>
        </div>
        <WeekBars days={stats.responsesByDay} />
      </StatCard>

      <StatCard className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted-foreground">Completion rate</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[30px] font-semibold leading-none tracking-[-0.01em] text-card-foreground">
              {stats.completionRate === null ? "—" : `${Math.round(stats.completionRate * 100)}%`}
            </span>
            <span className="text-[13px] text-muted-foreground">of starts finish</span>
          </div>
        </div>
        {stats.completionRate !== null && <CompletionRing rate={stats.completionRate} />}
      </StatCard>

      {/* Hidden rather than shown empty: on a new account there is no best
          performer, and an empty third card reads as something that failed
          to load. The row falls to two columns instead. */}
      {stats.bestPerformer && (
        <StatCard className="flex items-start gap-3.5">
          <span
            aria-hidden
            className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-success-bg"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 13.5l4.5-4.5 3 3L17 5.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-success"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-[13px] text-muted-foreground">Best performer</div>
            <Link
              href={`/admin/surveys/${stats.bestPerformer.id}`}
              className="mt-0.5 block text-[16px] font-semibold leading-[1.3] text-card-foreground hover:underline"
            >
              {stats.bestPerformer.title}
            </Link>
            <div className="mt-1 text-[13px] text-muted-foreground">
              {stats.bestPerformer.responseCount} responses
            </div>
          </div>
        </StatCard>
      )}
    </div>
  );
}
