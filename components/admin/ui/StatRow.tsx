import Link from "next/link";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "@/lib/format";
import { bg, border, radius, text } from "./tokens";

export type Stat = {
  /** Two words. A noun: "Unworked", "Meetings booked". */
  label: string;
  /**
   * A number, a percentage or a duration, already formatted. Pass EMPTY_VALUE
   * for "not known yet". Never a title, a name or a sentence: a named winner
   * belongs in a list row, not a stat cell.
   */
  value: React.ReactNode;
  /** Sets the value in the accent. One cell per row: the one to act on. */
  emphasis?: boolean;
  /** A short qualifier after the value, on its baseline. */
  note?: React.ReactNode;
  /** One short line beneath the number: a delta, a qualifier. */
  delta?: React.ReactNode;
  /** Makes the cell a link. Only when there is somewhere specific to go. */
  href?: string;
};

/**
 * One stat layout for every admin page: a joined bar of cells on the card
 * radius, divided by hairlines.
 *
 * Each cell is a label over a value. Stacked on narrow screens the rule runs
 * horizontally; from `sm` up it flips to vertical hairlines between columns.
 */
const CELL = cn(
  "flex min-w-0 flex-1 flex-col gap-1 border-t px-5 py-[14px] first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0",
  border.base
);

function CellBody({ stat }: { stat: Stat }) {
  return (
    <>
      <span className={cn("ds-caption truncate", text.muted2)}>{stat.label}</span>
      <span className="flex items-baseline gap-2">
        <span className={cn("ds-stat tabular-nums", stat.emphasis ? text.accent : text.ink)}>
          {stat.value ?? EMPTY_VALUE}
        </span>
        {stat.note && <span className={cn("ds-caption", text.muted2)}>{stat.note}</span>}
      </span>
      {stat.delta && <span className={cn("ds-mono-count", text.muted2)}>{stat.delta}</span>}
    </>
  );
}

export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  if (stats.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden border sm:flex-row",
        radius.card,
        border.base,
        bg.base,
        className
      )}
    >
      {stats.map((stat) =>
        stat.href ? (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(CELL, "focus-ring transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]")}
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
