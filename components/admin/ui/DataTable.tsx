import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { bg, border, radius, text } from "./tokens";

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };

/**
 * Named fixed column widths. `xxs` fits a bare checkbox, `xs` a score badge
 * or a row menu, `sm` a short count or a relative time, `md` a status select
 * or a relative time with its sort chevron, `lg` a status select beside a
 * button. Fluid columns take a fraction instead.
 *
 * The steps are px rather than rem. A fixed column is a budget the fluid
 * columns get what is left of, and a rem budget grows with the visitor's
 * browser font setting while the page does not. Same reasoning as the px
 * type styles in app/globals.css.
 */
export type ColumnWidth = "xxs" | "xs" | "sm" | "md" | "lg";

const WIDTH_CLASSES: Record<ColumnWidth, string> = {
  xxs: "w-[40px]",
  xs: "w-[64px]",
  sm: "w-[96px]",
  md: "w-[128px]",
  lg: "w-[176px]",
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
 * The two-line cell: a primary line over a secondary one, both on one line
 * each and ellipsized. Name over title, company over study. Use it in a
 * `density="stacked"` table, and pass `title` on the column if the full value
 * has to stay reachable.
 */
export function StackedCell({
  primary,
  secondary,
  className,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className={cn("ds-row-primary block truncate", text.ink)}>{primary}</span>
      {secondary !== undefined && secondary !== null && (
        <span className={cn("block truncate text-[12px] leading-[1.4]", text.muted2)}>{secondary}</span>
      )}
    </span>
  );
}

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
  gridTemplate,
  stickyHeader = true,
  sort,
  onSort,
  empty,
  footer,
  className,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Makes the whole row navigable without nesting anchors inside cells. */
  rowHref?: (row: Row) => string | null;
  /** Per-row modifier, e.g. dimming a row that has gone stale. */
  rowClassName?: (row: Row) => string | undefined;
  /**
   * `stacked` rows are 60px, for two-line cells (StackedCell). `default` rows
   * are 54px, one line. `compact` is the older name for the dense table and
   * now renders as `default`; Ledger II has two row heights, not three. The
   * header is 42px either way.
   */
  density?: "default" | "compact" | "stacked";
  /**
   * `fixed` makes the declared column widths authoritative, which is what a
   * truncating column needs: under auto layout the longest cell still widens
   * its column and the ellipsis never appears. Every column should declare a
   * `width` except, at most, the one that is the row's label: with none it
   * takes whatever the others leave, which is the only way a mix of px steps
   * and fractions can be made to add up at every table width.
   */
  layout?: "auto" | "fixed";
  /**
   * A `grid-template-columns` value, for a table whose columns are specified
   * as a grid (`24px minmax(0,1.6fr) 56px`). Every row, the header included,
   * is laid out on it with 16px between columns and 20px at the two ends, so
   * a column is exactly the width the template says. Column `width` and
   * `layout` are ignored. One track per column, in order.
   */
  gridTemplate?: string;
  /** Header sticks to the top of the scroll container, on the card fill. */
  stickyHeader?: boolean;
  sort?: SortState;
  onSort?: (key: string) => void;
  /** One sentence and, optionally, one action. */
  empty: { title: string; action?: React.ReactNode };
  /**
   * A last row inside the frame, under a hairline: "Show all 14". Not
   * rendered with the empty state.
   */
  footer?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty.title} action={empty.action} className={className} />;
  }

  // Row height is set here and the cell padding derives from it, so a table
  // cannot end up denser than another table by having picked its own py-*.
  // px for the same reason as the column widths above.
  const rowHeight = density === "stacked" ? "h-[60px]" : "h-[54px]";
  const labelIndex = Math.max(
    0,
    columns.findIndex((column) => column.rowLabel)
  );
  // Grid rows take the table elements out of table layout, which also takes
  // their implicit roles with it in some browsers; the roles are restated.
  const grid = gridTemplate !== undefined;
  const gridStyle: React.CSSProperties | undefined = grid
    ? { gridTemplateColumns: gridTemplate }
    : undefined;
  const cellPad = grid ? "block min-w-0 p-0" : CELL_PAD;

  return (
    <div
      className={cn("relative w-full overflow-auto border", radius.card, border.base, bg.base, className)}
    >
      <table
        role={grid ? "table" : undefined}
        className={cn(
          "w-full caption-bottom border-collapse",
          grid ? "block" : layout === "fixed" && "table-fixed"
        )}
      >
        <thead role={grid ? "rowgroup" : undefined} className={grid ? "block" : undefined}>
          <tr
            role={grid ? "row" : undefined}
            style={gridStyle}
            className={
              grid
                ? cn(GRID_ROW, "h-[42px]", bg.sidebar, stickyHeader && "sticky top-0 z-20")
                : undefined
            }
          >
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  role={grid ? "columnheader" : undefined}
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
                  style={grid ? undefined : widthStyle(column.width)}
                  className={cn(
                    "whitespace-nowrap align-middle text-[12px] font-bold leading-none",
                    cellPad,
                    text.muted2,
                    !grid && "h-[42px]",
                    !grid && bg.sidebar,
                    !grid && stickyHeader && "sticky top-0 z-20",
                    !grid && widthClass(column.width),
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
        <tbody role={grid ? "rowgroup" : undefined} className={grid ? "block" : undefined}>
          {rows.map((row) => {
            const href = rowHref?.(row) ?? null;
            return (
              <tr
                key={rowKey(row)}
                role={grid ? "row" : undefined}
                style={gridStyle}
                className={cn(
                  "group/row border-t transition-colors",
                  grid && GRID_ROW,
                  border.base,
                  rowHeight,
                  href && "relative cursor-pointer hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
                  rowClassName?.(row)
                )}
              >
                {columns.map((column, i) => (
                  <td
                    key={column.key}
                    title={column.title?.(row)}
                    role={grid ? "cell" : undefined}
                    className={cn(
                      "ds-body align-middle tabular-nums",
                      cellPad,
                      text.ink3,
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
                        // A grid cell's content fills its track, so a
                        // stacked cell inside it can ellipsize.
                        grid && "block min-w-0",
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
      {footer !== undefined && footer !== null && (
        <div className={cn("border-t", border.base)}>{footer}</div>
      )}
    </div>
  );
}

// 16px between columns, 20px at the row's two ends.
const CELL_PAD = "px-[8px] first:pl-[20px] last:pr-[20px]";
// The same two numbers for a row laid out on `gridTemplate`.
const GRID_ROW = "grid items-center gap-x-[16px] px-[20px]";

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
      className="focus-ring inline-flex items-center gap-1 rounded-control font-[inherit] text-inherit hover:text-[color:hsl(var(--ds-ink))]"
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
        active ? text.ink : text.muted3,
        active && direction === "asc" && "rotate-180"
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
