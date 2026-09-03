import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };

/**
 * Named fixed column widths, on the Tailwind width scale rather than as raw
 * px. `xxs` fits a bare checkbox, `xs` a score badge or a row menu, `sm` a
 * short count or a relative time, `md` a status select or a relative time
 * with its sort chevron, `lg` a short phrase like "4 of 8". Fluid columns
 * take a fraction instead.
 */
export type ColumnWidth = "xxs" | "xs" | "sm" | "md" | "lg";

const WIDTH_CLASSES: Record<ColumnWidth, string> = {
  xxs: "w-10",
  xs: "w-16",
  sm: "w-24",
  md: "w-32",
  lg: "w-44",
};

export type Column<Row> = {
  key: string;
  header: React.ReactNode;
  /**
   * Numeric columns right-align. Every cell already carries tabular figures,
   * so a column of scores lines up whichever way it is aligned. This is the
   * primitive's job rather than the call site's.
   */
  align?: "left" | "right" | "center";
  /**
   * A named fixed step, or a fraction of the table as a number below 1 (0.28).
   * Fractions exist because most admin columns want a share of whatever width
   * the page has.
   */
  width?: ColumnWidth | number;
  /**
   * One line, ellipsis. Pair it with `title` so the full value is still
   * reachable, and with `layout="fixed"` on the table so the declared widths
   * are what the columns actually get.
   */
  truncate?: boolean;
  /** The full value, set as the cell's `title` attribute. For truncated columns. */
  title?: (row: Row) => string | undefined;
  /** Renders a sort control in the header. Requires `sortValue`. */
  sortable?: boolean;
  /** The value this column sorts on. Nulls always sort last, in both directions. */
  sortValue?: (row: Row) => number | string | null | undefined;
  /** Set on a sortable column so the header announces its sort state. */
  ariaSort?: "ascending" | "descending" | "none";
  /**
   * This column is the row's name: it underlines on row hover when the row is
   * a link. Defaults to the first column, which is wrong only when the first
   * column is a checkbox.
   */
  rowLabel?: boolean;
  cell: (row: Row) => React.ReactNode;
};

/**
 * Header, rows, empty state. Owns column alignment, density, the frame and
 * the row link.
 *
 * The frame (card surface, hairline border, radius) is drawn here rather than
 * by a Card around the table, because it exists only while there are rows.
 * With no rows the table renders EmptyState bare: no column headers, no
 * border, one sentence. Framing emptiness is the thing this shape prevents.
 *
 * Deliberately stateless, including the sort: `app/admin/HomeSections.tsx`
 * renders this from a server component, and a `useState` here would make that
 * page a client bundle (its `cell` functions cannot cross the boundary at
 * all). Sorting lives in `useTableSort`, a client hook in the same folder,
 * which hands back `sort`/`onSort` for this component to render.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowHref,
  rowClassName,
  density = "default",
  layout = "auto",
  stickyHeader = true,
  sort,
  onSort,
  empty,
  className,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Makes the whole row navigable without nesting anchors inside cells. */
  rowHref?: (row: Row) => string | null;
  /** Per-row modifier, e.g. dimming a row that has gone stale. */
  rowClassName?: (row: Row) => string | undefined;
  /** `default` rows are h-12, `compact` h-10. The header is h-9 either way. */
  density?: "default" | "compact";
  /**
   * `fixed` makes the declared column widths authoritative, which is what a
   * truncating column needs: under auto layout the longest cell still widens
   * its column and the ellipsis never appears. Only for tables where every
   * column declares a `width`.
   */
  layout?: "auto" | "fixed";
  /** Header sticks to the top of the scroll container, on the card fill. */
  stickyHeader?: boolean;
  sort?: SortState;
  onSort?: (key: string) => void;
  /** One sentence and, optionally, one action. */
  empty: { title: string; action?: React.ReactNode };
  className?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty.title} action={empty.action} className={className} />;
  }

  // Row height is set here and the cell padding derives from it, so a table
  // cannot end up denser than another table by having picked its own py-*.
  const rowHeight = density === "compact" ? "h-10" : "h-12";
  const labelIndex = Math.max(
    0,
    columns.findIndex((column) => column.rowLabel)
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-card border border-border bg-card",
        className
      )}
    >
      <table
        className={cn("w-full caption-bottom border-collapse", layout === "fixed" && "table-fixed")}
      >
        <thead className="border-b border-border">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    column.ariaSort ??
                    (column.sortable
                      ? active
                        ? sort?.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined)
                  }
                  style={widthStyle(column.width)}
                  className={cn(
                    "type-table-head h-9 whitespace-nowrap px-3 align-middle [&_button]:uppercase",
                    stickyHeader && "sticky top-0 z-20 bg-card",
                    widthClass(column.width),
                    alignClasses(column.align)
                  )}
                >
                  {column.sortable && onSort ? (
                    <SortButton
                      active={active}
                      direction={sort?.direction ?? "desc"}
                      onClick={() => onSort(column.key)}
                    >
                      {column.header}
                    </SortButton>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row) ?? null;
            return (
              <tr
                key={rowKey(row)}
                className={cn(
                  "group/row border-b border-border transition-colors last:border-b-0",
                  rowHeight,
                  href && "relative cursor-pointer hover:bg-secondary",
                  rowClassName?.(row)
                )}
              >
                {columns.map((column, i) => (
                  <td
                    key={column.key}
                    title={column.title?.(row)}
                    className={cn(
                      "px-3 align-middle font-archivo text-sm tabular-nums",
                      alignClasses(column.align)
                    )}
                  >
                    {/* The stretched link lives in the first cell and sits
                        under everything else, so an interactive cell later
                        in the row still paints over it. Cell content is
                        click-through (`pointer-events-none`) so a click on
                        the text itself reaches the link underneath; without
                        that, only the bare padding navigated. Real controls
                        take their pointer events back, which is what keeps
                        an in-row select or checkbox working. */}
                    {href && i === 0 && (
                      <a href={href} className="focus-ring absolute inset-0 z-0" aria-label="Open">
                        <span className="sr-only">Open</span>
                      </a>
                    )}
                    <span
                      className={cn(
                        "relative",
                        href &&
                          "z-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_label]:pointer-events-auto [&_select]:pointer-events-auto [&_textarea]:pointer-events-auto",
                        column.truncate && "block truncate",
                        // The row's name underlines on row hover, which is
                        // what makes the whole row read as the link it is.
                        href && i === labelIndex && "group-hover/row:underline"
                      )}
                    >
                      {column.cell(row)}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function alignClasses(align: Column<unknown>["align"]) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function widthStyle(width: Column<unknown>["width"]): React.CSSProperties | undefined {
  if (typeof width === "number") return { width: `${width * 100}%` };
  return undefined;
}

function widthClass(width: Column<unknown>["width"]): string | undefined {
  if (typeof width === "string") return WIDTH_CLASSES[width];
  return undefined;
}

function SortButton({
  active,
  direction,
  onClick,
  children,
}: {
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex items-center gap-1 rounded-control font-[inherit] text-inherit hover:text-card-foreground"
    >
      {children}
      <SortChevron active={active} direction={direction} />
    </button>
  );
}

function SortChevron({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-3 w-3 shrink-0 transition-transform",
        active ? "text-card-foreground" : "text-faint",
        active && direction === "asc" && "rotate-180"
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
