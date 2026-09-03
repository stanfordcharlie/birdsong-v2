"use client";

import { useMemo, useState } from "react";
import type { Column, SortDirection, SortState } from "./DataTable";

/**
 * Client-side sorting for `DataTable`, over the rows already loaded.
 *
 * A hook rather than state inside `DataTable` because the table is rendered
 * from a server component on the admin home, where a `useState` would be a
 * hard error. This keeps the sort where the state can actually live and hands
 * the table back a plain `sort`/`onSort` pair.
 *
 * Click order on a sortable header: descending, ascending, then back to the
 * table's own default order. Highest-first is what a score column is opened
 * for, so it is the first click rather than the second.
 */
export function useTableSort<Row>(
  rows: Row[],
  columns: Column<Row>[],
  defaultSort?: SortState
) {
  const [sort, setSort] = useState<SortState | undefined>(defaultSort);

  function onSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "desc" };
      if (current.direction === "desc") return { key, direction: "asc" };
      return defaultSort;
    });
  }

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;

    // Nulls always sort to the bottom regardless of direction, so an
    // ascending sort surfaces the lowest real value rather than a run of
    // blanks.
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      const aEmpty = av === null || av === undefined;
      const bEmpty = bv === null || bv === undefined;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const delta =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? delta : -delta;
    });
    // `columns` is rebuilt on every render at most call sites (the headers
    // close over the sort state), so it is deliberately not a dependency —
    // only the rows and the sort actually change the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return { rows: sorted, sort, onSort };
}

export type { SortDirection, SortState };
