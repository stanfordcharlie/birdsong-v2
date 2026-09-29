"use client";

import { useMemo, useState } from "react";
import {
  DataTable,
  RelativeTime,
  ScoreChip,
  StackedCell,
  useTableSort,
  type Column,
} from "@/components/admin/ui";
import { dot, text } from "@/components/admin/ui/tokens";
import { EMPTY_VALUE } from "@/lib/format";
import { scoresWorthACall } from "@/lib/leads";
import { cn } from "@/lib/utils";

/**
 * The study's responses, built from design/mockups/Study.html.
 *
 * Shaped on the server so this stays a display component: company, title and
 * the turn count are all derived from `Json` columns this file has no
 * business parsing.
 */
export type ResponseTableRow = {
  id: string;
  name: string | null;
  /** Job title, from custom_field_values.job_title. */
  title: string | null;
  /** From custom_field_values.company / derived_company_name. */
  company: string | null;
  /** The email's domain, the fallback when no company was collected. */
  emailDomain: string | null;
  leadScore: number | null;
  fitScore: number | null;
  /**
   * `live` is an interview that has not finished and started recently enough
   * to still be running; `ended` is one that has not finished and did not.
   * Decided on the server, against the server's clock.
   */
  state: "completed" | "live" | "ended";
  /** Questions asked so far. Shown on rows that have not finished. */
  turn: number;
  /** The interview's start time. */
  createdAt: string;
};

// What the table shows before "Show all".
const COLLAPSED_ROWS = 6;

// Name, Company, Score, Fit, Status, When.
const GRID_TEMPLATE = "minmax(0,1.4fr) minmax(0,1fr) 56px 56px 120px 80px";

const STATE: Record<ResponseTableRow["state"], { label: string; dot: string; ink: string }> = {
  completed: { label: "Completed", dot: dot.accent, ink: text.accent },
  live: { label: "Live", dot: dot.accent, ink: text.accent },
  ended: { label: "Ended early", dot: dot.muted3, ink: text.muted3 },
};

function turnLabel(row: ResponseTableRow): string | null {
  return row.turn > 0 ? `Turn ${row.turn}` : null;
}

function NameCell({ row }: { row: ResponseTableRow }) {
  if (row.state === "completed") {
    return <StackedCell primary={row.name || EMPTY_VALUE} secondary={row.title ?? undefined} />;
  }
  const turn = turnLabel(row);
  // A row that has not finished leads with what it is. A name the
  // respondent already gave still shows, above it.
  const progress = row.state === "live" ? "In progress" : null;
  if (!row.name) {
    return (
      <StackedCell
        primary={progress ?? EMPTY_VALUE}
        secondary={turn ? <span className="font-mono">{turn}</span> : undefined}
      />
    );
  }
  return (
    <StackedCell
      primary={row.name}
      secondary={
        progress || turn ? (
          <>
            {progress}
            {progress && turn && " · "}
            {turn && <span className="font-mono">{turn}</span>}
          </>
        ) : (
          (row.title ?? undefined)
        )
      }
    />
  );
}

function CompanyCell({ row }: { row: ResponseTableRow }) {
  if (row.company) return <>{row.company}</>;
  // Muted, because a domain is an inference from the email rather than
  // something the respondent told us.
  if (row.emailDomain) return <span className={text.muted2}>{row.emailDomain}</span>;
  return <span className={text.muted3}>{EMPTY_VALUE}</span>;
}

const COLUMNS: Column<ResponseTableRow>[] = [
  {
    key: "name",
    header: "Name",
    title: (row) => row.name ?? undefined,
    cell: (row) => <NameCell row={row} />,
  },
  {
    key: "company",
    header: "Company",
    truncate: true,
    title: (row) => row.company ?? row.emailDomain ?? undefined,
    cell: (row) => <CompanyCell row={row} />,
  },
  {
    key: "score",
    header: "Score",
    sortable: true,
    sortValue: (row) => row.leadScore,
    // No chips on an interview that has not finished: it has no score yet.
    cell: (row) => (row.state === "completed" ? <ScoreChip score={row.leadScore} /> : null),
  },
  {
    key: "fit",
    header: "Fit",
    sortable: true,
    sortValue: (row) => row.fitScore,
    cell: (row) => (row.state === "completed" ? <ScoreChip score={row.fitScore} variant="fit" /> : null),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => {
      const state = STATE[row.state];
      return (
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold", state.ink)}>
          <span aria-hidden className={cn("h-[6px] w-[6px] shrink-0 rounded-full", state.dot)} />
          {state.label}
        </span>
      );
    },
  },
  {
    key: "when",
    header: "When",
    align: "right",
    sortable: true,
    sortValue: (row) => new Date(row.createdAt).getTime(),
    cell: (row) => (
      <RelativeTime date={row.createdAt} align="right" className={cn("ds-mono-count", text.muted2)} />
    ),
  },
];

export function ResponsesTable({
  responses,
  query,
  worthOnly,
}: {
  responses: ResponseTableRow[];
  /** The tab row's search field: name, title or company. */
  query: string;
  /** The tab row's "Worth a call only" toggle. */
  worthOnly: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return responses.filter((row) => {
      if (
        worthOnly &&
        !scoresWorthACall({ leadScore: row.leadScore, completed: row.state === "completed" })
      ) {
        return false;
      }
      if (
        q &&
        ![row.name, row.title, row.company, row.emailDomain].some((field) => field?.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [responses, query, worthOnly]);

  // Rows arrive newest first, which is the default order.
  const { rows, sort, onSort } = useTableSort(filtered, COLUMNS, { key: "when", direction: "desc" });

  const collapsed = !showAll && rows.length > COLLAPSED_ROWS;
  const visible = collapsed ? rows.slice(0, COLLAPSED_ROWS) : rows;

  return (
    <DataTable
      columns={COLUMNS}
      rows={visible}
      rowKey={(row) => row.id}
      rowHref={(row) => `/admin/responses/${row.id}`}
      density="stacked"
      gridTemplate={GRID_TEMPLATE}
      sort={sort}
      onSort={onSort}
      empty={{ title: responses.length === 0 ? "No responses yet." : "No responses match." }}
      footer={
        collapsed ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cn(
              "focus-ring flex h-[44px] w-full items-center justify-center gap-[0.35em] text-[13px] font-bold transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
              text.accent
            )}
          >
            Show all <span className="font-mono font-medium">{rows.length}</span>
          </button>
        ) : undefined
      }
    />
  );
}
