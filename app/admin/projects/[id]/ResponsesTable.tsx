"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  FilterTabs,
  RelativeTime,
  ScoreBadge,
  StatusDot,
  useTableSort,
  type Column,
} from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import { isWorthACall } from "@/lib/leads";

/**
 * The study's responses, directly under its stat row.
 *
 * Shaped on the server so this stays a display component: the company value
 * and the email fallback are both derived from `custom_field_values`, which
 * is a `Json` column this file has no business parsing.
 */
export type ResponseTableRow = {
  id: string;
  name: string | null;
  /** From custom_field_values.company / derived_company_name. */
  company: string | null;
  /** The email's domain, the fallback when no company was collected. */
  emailDomain: string | null;
  leadScore: number | null;
  status: string;
  completed: boolean;
  /**
   * The interview's start time. There is no `completed_at` column, so this
   * is what both the "Completed" column and the Leads queue's own Completed
   * column already show. See the report's follow-ups.
   */
  createdAt: string;
};

type ResponseFilter = "all" | "worth_a_call" | "in_progress";

// Beyond this the table stops being a table and starts being a page you
// scroll. Server pagination is a separate piece of work; this is the honest
// stopgap rather than silently rendering 400 rows.
const VISIBLE_ROW_LIMIT = 50;

function CompanyCell({ row }: { row: ResponseTableRow }) {
  if (row.company) return <>{row.company}</>;
  // Muted, because a domain is an inference from the email rather than
  // something the respondent told us.
  if (row.emailDomain) return <span className="text-muted-foreground">{row.emailDomain}</span>;
  return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
}

const COLUMNS: Column<ResponseTableRow>[] = [
  {
    key: "name",
    header: "Name",
    width: 0.28,
    truncate: true,
    title: (row) => row.name ?? undefined,
    cell: (row) => <span className="font-medium">{row.name || EMPTY_VALUE}</span>,
  },
  {
    key: "company",
    header: "Company",
    width: 0.28,
    truncate: true,
    title: (row) => row.company ?? row.emailDomain ?? undefined,
    cell: (row) => <CompanyCell row={row} />,
  },
  {
    key: "score",
    header: "Score",
    align: "center",
    width: "xs",
    sortable: true,
    sortValue: (row) => row.leadScore,
    cell: (row) => <ScoreBadge score={row.leadScore} />,
  },
  {
    key: "status",
    header: "Status",
    width: "md",
    cell: (row) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-muted-foreground">
        <StatusDot live={!row.completed} />
        {row.completed ? "Completed" : "In progress"}
      </span>
    ),
  },
  {
    key: "completed",
    header: "Completed",
    align: "right",
    width: "md",
    sortable: true,
    sortValue: (row) => new Date(row.createdAt).getTime(),
    cell: (row) => (
      <RelativeTime
        date={row.createdAt}
        align="right"
        prefix={row.completed ? undefined : "started"}
        className="text-muted-foreground"
      />
    ),
  },
];

export function ResponsesTable({ responses }: { responses: ResponseTableRow[] }) {
  const [filter, setFilter] = useState<ResponseFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const counts = useMemo(
    () => ({
      all: responses.length,
      worth_a_call: responses.filter((r) =>
        isWorthACall({ leadScore: r.leadScore, status: r.status, completed: r.completed })
      ).length,
      in_progress: responses.filter((r) => !r.completed).length,
    }),
    [responses]
  );

  const filtered = useMemo(() => {
    if (filter === "worth_a_call") {
      return responses.filter((r) =>
        isWorthACall({ leadScore: r.leadScore, status: r.status, completed: r.completed })
      );
    }
    if (filter === "in_progress") return responses.filter((r) => !r.completed);
    return responses;
  }, [responses, filter]);

  const { rows, sort, onSort } = useTableSort(filtered, COLUMNS, {
    key: "completed",
    direction: "desc",
  });

  const truncated = !showAll && rows.length > VISIBLE_ROW_LIMIT;
  const visible = truncated ? rows.slice(0, VISIBLE_ROW_LIMIT) : rows;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-eyebrow">Responses</h2>
        <FilterTabs
          label="Filter responses"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", count: counts.all },
            { value: "worth_a_call", label: "Worth a call", count: counts.worth_a_call },
            { value: "in_progress", label: "In progress", count: counts.in_progress },
          ]}
        />
      </div>

      <DataTable
        columns={COLUMNS}
        rows={visible}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/responses/${row.id}`}
        layout="fixed"
        sort={sort}
        onSort={onSort}
        empty={{ title: "No responses yet." }}
      />

      {truncated && (
        <div className="mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowAll(true)}>
            Show all {rows.length}
          </Button>
        </div>
      )}
    </section>
  );
}
