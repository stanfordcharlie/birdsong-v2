import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export type Column<Row> = {
  key: string;
  header: React.ReactNode;
  /**
   * Numeric columns right-align and get tabular figures, both here and in the
   * header, so a column of scores actually lines up. This is the primitive's
   * job rather than the call site's: alignment was being set ad hoc per cell,
   * which is why numeric columns aligned differently on different pages.
   */
  align?: "left" | "right";
  /** Fixed width, e.g. "92px". Omit to let the column size itself. */
  width?: string;
  /** Set on a sortable column so the header announces its sort state. */
  ariaSort?: "ascending" | "descending" | "none";
  cell: (row: Row) => React.ReactNode;
};

/**
 * Header, rows, empty state. Owns column alignment rules.
 *
 * The empty state renders exactly once, inside the table body, spanning every
 * column. A caller that also renders its own "nothing here" message above the
 * table is the bug this shape prevents.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowHref,
  rowClassName,
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
  empty: { title: string; description?: string; action?: React.ReactNode };
  className?: string;
}) {
  return (
    <div className={cn("relative w-full overflow-auto", className)}>
      <table className="w-full caption-bottom border-collapse">
        <thead className="border-b border-border">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.ariaSort}
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  "type-table-head h-10 px-4 align-middle [&_button]:uppercase",
                  column.align === "right" ? "text-right tabular-nums" : "text-left"
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <EmptyState {...empty} />
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const href = rowHref?.(row) ?? null;
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-chip transition-colors last:border-b-0",
                    href && "relative hover:bg-secondary",
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((column, i) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3.5 align-middle font-archivo text-sm",
                        column.align === "right" ? "text-right tabular-nums" : "text-left"
                      )}
                    >
                      {/* The stretched link lives in the first cell and sits
                          under everything else, so an interactive cell later
                          in the row still receives its own clicks. */}
                      {href && i === 0 && (
                        <a href={href} className="focus-ring absolute inset-0 z-0" aria-label="Open">
                          <span className="sr-only">Open</span>
                        </a>
                      )}
                      <span className={cn("relative", href && "z-10")}>{column.cell(row)}</span>
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
