import Link from "next/link";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "@/lib/format";

export type Stat = {
  label: string;
  /** Already formatted. Pass EMPTY_VALUE for "not known yet". */
  value: React.ReactNode;
  /** Optional trailing note: a delta, a unit, a share. Never the value itself. */
  hint?: React.ReactNode;
  /** Makes the cell a link. Only use it when there is somewhere specific to go. */
  href?: string;
};

/**
 * One stat layout for every admin page.
 *
 * The surface previously carried four: a joined segmented bar (Home), three
 * detached cards with their own chrome (Surveys), detached button-cards with
 * progress bars (Leads), and a bare three-column grid with no card at all
 * (Survey detail). This is the joined bar, applied everywhere.
 *
 * Why the bar and not the detached cards:
 *
 * - It is the only one that survives a variable stat count without leaving a
 *   hole. Surveys hid its third card and Home collapsed its report card, both
 *   working around a fixed grid; the bar just has fewer cells.
 * - At 1140px, three detached cards give each stat ~350px of width to hold a
 *   32px numeral, which is most of why Surveys and Leads read as different
 *   products sitting next to each other.
 * - Borders do the dividing rather than gaps, so it reads as one ruled object
 *   rather than as three things that happen to be adjacent.
 *
 * Stacked on narrow screens the rule runs horizontally; from `sm` up it flips
 * to vertical hairlines between columns.
 */
const CELL =
  "flex flex-1 flex-col gap-1.5 border-t border-chip px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0";

function CellBody({ stat }: { stat: Stat }) {
  return (
    <>
      <span className="type-metric-label">{stat.label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="type-metric-value">{stat.value ?? EMPTY_VALUE}</span>
        {stat.hint && <span className="type-body-sm text-muted-foreground">{stat.hint}</span>}
      </span>
    </>
  );
}

export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  if (stats.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card sm:flex-row",
        className
      )}
    >
      {stats.map((stat) =>
        stat.href ? (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(CELL, "focus-ring transition-colors hover:bg-secondary")}
          >
            <CellBody stat={stat} />
          </Link>
        ) : (
          <div key={stat.label} className={CELL}>
            <CellBody stat={stat} />
          </div>
        )
      )}
    </div>
  );
}
