"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import {
  Button,
  DataTable,
  RelativeTime,
  ScoreChip,
  SelectBox,
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
  /** Whether this one already reached HubSpot, for the delete confirmation. */
  hubspotSynced: boolean;
};

// What the table shows before "Show all".
const COLLAPSED_ROWS = 6;

// Name, Company, Score, Fit, Status, When.
const GRID_TEMPLATE = "minmax(0,1.4fr) minmax(0,1fr) 56px 56px 120px 80px";
// The same six tracks with the selection box in front, used when the admin
// may delete. 28px is the box plus the gap it needs from the name beside it.
const GRID_TEMPLATE_SELECTABLE = `28px ${GRID_TEMPLATE}`;

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

const BASE_COLUMNS: Column<ResponseTableRow>[] = [
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

/**
 * The bar that appears above the table while rows are checked, and the
 * confirmation behind its Delete.
 *
 * Soft delete: the rows come off every admin surface and the transcripts stay
 * in the database (supabase/migrations/20260929000000_response_soft_delete.sql).
 * The dialog says what a delete does not do, because the one thing an admin
 * cannot undo from here is the HubSpot deal a pushed response already created.
 */
function DeleteBar({
  selected,
  onCancel,
  onDeleted,
}: {
  selected: ResponseTableRow[];
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selected.length;
  const noun = count === 1 ? "response" : "responses";
  const pushed = selected.filter((row) => row.hubspotSynced).length;

  const description = [
    count === 1
      ? `${selected[0].name || "This response"} comes off this study's stats, the Responses tab and the Leads queue.`
      : `${count} responses come off this study's stats, the Responses tab and the Leads queue.`,
    "The transcripts are kept, so this can be reversed in the database.",
    pushed > 0 &&
      (pushed === 1
        ? "One of them was pushed to HubSpot. That deal stays in HubSpot."
        : `${pushed} of them were pushed to HubSpot. Those deals stay in HubSpot.`),
  ]
    .filter(Boolean)
    .join(" ");

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/responses/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selected.map((row) => row.id) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Couldn't delete ${count === 1 ? "that response" : "those responses"}`);
      setDialogOpen(false);
      onDeleted();
      // The stats, the table and the sidebar's Leads count are all
      // server-rendered from the same read, so one refresh moves them
      // together. No reload: the tab, the search and the scroll position stay.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Couldn't delete ${count === 1 ? "that response" : "those responses"}`
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-card border border-primary/30 bg-primary/[0.06] px-4 py-2.5"
        role="region"
        aria-label="Selected responses"
      >
        <span className="type-body font-semibold text-card-foreground">{count} selected</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setError(null);
              setDialogOpen(true);
            }}
            disabled={pending}
            className="text-destructive"
          >
            Delete {count === 1 ? "" : count} {noun}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
      {error && (
        <p className="type-body text-destructive" role="status">
          {error}
        </p>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !pending && setDialogOpen(false)}
        title={count === 1 ? "Delete this response?" : `Delete ${count} responses?`}
        description={description}
      >
        <div className="flex flex-col gap-3">
          {error && <p className="type-body text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting..." : `Delete ${count === 1 ? noun : `${count} ${noun}`}`}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function ResponsesTable({
  responses,
  query,
  worthOnly,
  canDelete = false,
}: {
  responses: ResponseTableRow[];
  /** The tab row's search field: name, title or company. */
  query: string;
  /** The tab row's "Worth a call only" toggle. */
  worthOnly: boolean;
  /** From can(role, "response:delete") on the server. False hides selection. */
  canDelete?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  // Ids, not rows: the table is server-rendered and refreshes after a delete,
  // so a held row object would go stale. Anything checked that is no longer
  // in `responses` is dropped when the prop changes, which is also what
  // clears the bar once a delete has landed.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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
  const { rows, sort, onSort } = useTableSort(filtered, BASE_COLUMNS, { key: "when", direction: "desc" });

  const collapsed = !showAll && rows.length > COLLAPSED_ROWS;
  const visible = collapsed ? rows.slice(0, COLLAPSED_ROWS) : rows;

  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current;
      const present = new Set(responses.map((row) => row.id));
      const next = new Set(Array.from(current).filter((id) => present.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [responses]);

  const selectedRows = useMemo(
    () => responses.filter((row) => selectedIds.has(row.id)),
    [responses, selectedIds]
  );
  // The header box speaks for the rows on screen, not the whole study: with a
  // search, a filter or the collapsed six, "all" means all of these.
  const shownSelectedCount = visible.filter((row) => selectedIds.has(row.id)).length;
  const allShownSelected = visible.length > 0 && shownSelectedCount === visible.length;

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleShown(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of visible) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  const columns: Column<ResponseTableRow>[] = useMemo(() => {
    if (!canDelete) return BASE_COLUMNS;
    return [
      {
        key: "select",
        header: (
          <SelectBox
            checked={allShownSelected}
            indeterminate={!allShownSelected && shownSelectedCount > 0}
            onChange={toggleShown}
            label={
              visible.length === responses.length
                ? "Select all responses"
                : `Select all ${visible.length} responses shown`
            }
          />
        ),
        cell: (row) => (
          <SelectBox
            checked={selectedIds.has(row.id)}
            onChange={(checked) => toggleRow(row.id, checked)}
            label={`Select ${row.name || "this response"}`}
          />
        ),
      },
      ...BASE_COLUMNS,
    ];
    // toggleShown and toggleRow only ever set state, so they are stable in
    // effect even though they are redeclared each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDelete, allShownSelected, shownSelectedCount, selectedIds, visible, responses.length]);

  return (
    <div className="flex flex-col gap-4">
      {selectedRows.length > 0 && (
        <DeleteBar
          selected={selectedRows}
          onCancel={() => setSelectedIds(new Set())}
          onDeleted={() => setSelectedIds(new Set())}
        />
      )}
      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/responses/${row.id}`}
        density="stacked"
        gridTemplate={canDelete ? GRID_TEMPLATE_SELECTABLE : GRID_TEMPLATE}
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
    </div>
  );
}
