import Link from "next/link";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "@/lib/format";

export type Stat = {
  label: string;
  /**
   * A number, a percentage or a duration, already formatted. Pass EMPTY_VALUE
   * for "not known yet". Never a title, a name or a sentence: a named winner
   * belongs in a list row, not a stat cell.
   */
  value: React.ReactNode;
  /** One short line beneath the number: a delta, a qualifier. Neutral by default. */
  delta?: React.ReactNode;
  /** Makes the cell a link. Only when there is somewhere specific to go. */
  href?: string;
};

/**
 * One stat layout for every admin page: a joined, ruled bar of cells.
 *
 * Each cell is one vertical stack. Label in the micro size, muted; the number
 * in the metric role; an optional delta beneath it. Nothing sits inline
 * beside the number, so every value shares a baseline with its neighbours.
 * Vertical padding matches the content: the cell is exactly label, number,
 * optional delta, plus one spacing step above and below.
 *
 * Four stats maximum per page. A stat derivable from another in the same row
 * is cut, not shown twice.
 *
 * Stacked on narrow screens the rule runs horizontally; from `sm` up it flips
 * to vertical hairlines between columns.
 */
const CELL =
  "flex min-w-0 flex-1 flex-col gap-0.5 border-t border-border px-4 py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0";

function CellBody({ stat }: { stat: Stat }) {
  return (
    <>
      <span className="font-archivo text-micro text-muted-foreground">{stat.label}</span>
      <span className="type-metric-value">{stat.value ?? EMPTY_VALUE}</span>
      {stat.delta && (
        <span className="font-archivo text-micro tabular-nums text-muted-foreground">{stat.delta}</span>
      )}
    </>
  );
}

export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  if (stats.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-border bg-card sm:flex-row",
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
