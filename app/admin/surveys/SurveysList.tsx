"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable,
  FilterTabs,
  RelativeTime,
  SearchInput,
  StatusDot,
  useTableSort,
  type Column,
} from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SurveyRowActions } from "./SurveyRowActions";
import { SurveyBulkActionsBar } from "./SurveyBulkActionsBar";

export type SurveyListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  /** survey.num_questions, the target topic count, null on older rows. */
  questionCount: number | null;
  responseCount: number;
  lastResponseAt: string | null;
  createdAt: string;
  archivedAt: string | null;
};

type StatusFilter = "all" | "live" | "draft" | "archived";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

// Shared by the tab counts and the table so a tab can never promise a number
// the table then contradicts.
function matchesStatus(survey: SurveyListItem, filter: StatusFilter): boolean {
  const isArchived = survey.archivedAt !== null;
  // "All", "Live" and "Draft" all exclude archived surveys; archived only
  // ever shows up under its own tab.
  if (filter === "archived") return isArchived;
  if (isArchived) return false;
  if (filter === "live") return survey.status === "live";
  if (filter === "draft") return survey.status !== "live";
  return true;
}

function statusLabel(survey: SurveyListItem): string {
  if (survey.archivedAt !== null) return "Archived";
  return survey.status === "live" ? "Live" : "Draft";
}

export function SurveysList({
  surveys,
  initialStatusFilter = "all",
  canManage = true,
}: {
  surveys: SurveyListItem[];
  // Deep-link from the admin home, e.g. ?status=live.
  initialStatusFilter?: StatusFilter;
  // From can(role, "study:edit"/"study:delete") on the server. False hides
  // the row menu, the selection checkboxes and the bulk bar: a member reads
  // the list and opens studies, nothing more.
  canManage?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      if (!matchesStatus(survey, statusFilter)) return false;
      if (q && !survey.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [surveys, query, statusFilter]);

  // Tab counts ignore the search box: they describe what the account holds,
  // and a tab reading "Live 0" mid-search would look like the surveys went
  // away rather than like the query not matching them.
  const statusCounts = useMemo(() => {
    const counts = {} as Record<StatusFilter, number>;
    for (const filter of FILTERS) {
      counts[filter.value] = surveys.filter((s) => matchesStatus(s, filter.value)).length;
    }
    return counts;
  }, [surveys]);

  // Switching tabs changes what "archived" even means for the selection
  // (Live vs. Archived have opposite bulk actions), so a stale selection
  // carried across tabs would be confusing: clear it on tab change.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter]);

  // Prunes ids that disappeared from the underlying data (e.g. a bulk
  // delete just removed them) so the bulk bar's count/actions never
  // reference a survey that's gone.
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => surveys.some((s) => s.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [surveys]);

  const selectedSurveys = useMemo(
    () => filtered.filter((s) => selectedIds.has(s.id)),
    [filtered, selectedIds]
  );

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Columns are built inside the component because the checkbox cell closes
  // over the selection state. The kebab keeps its own pointer events under
  // the row link (DataTable), as does the checkbox.
  const selectColumn: Column<SurveyListItem> = {
    key: "select",
    header: <span className="sr-only">Select</span>,
    width: "xxs",
    cell: (survey) => (
      <span className="flex items-center">
        <Checkbox
          checked={selectedIds.has(survey.id)}
          onChange={() => toggleOne(survey.id)}
          aria-label={`Select ${survey.title}`}
        />
      </span>
    ),
  };

  const actionsColumn: Column<SurveyListItem> = {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    width: "xs",
    cell: (survey) => (
      <SurveyRowActions
        surveyId={survey.id}
        internalName={survey.title}
        slug={survey.slug}
        status={survey.status}
        archivedAt={survey.archivedAt}
        responseCount={survey.responseCount}
      />
    ),
  };

  const columns: Column<SurveyListItem>[] = [
    ...(canManage ? [selectColumn] : []),
    {
      key: "title",
      header: "Title",
      width: 0.4,
      truncate: true,
      rowLabel: true,
      title: (survey) => survey.title,
      cell: (survey) => <span className="font-medium">{survey.title}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "md",
      cell: (survey) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <StatusDot live={survey.archivedAt === null && survey.status === "live"} />
          <span className="text-muted-foreground">{statusLabel(survey)}</span>
        </span>
      ),
    },
    {
      key: "questions",
      header: "Questions",
      align: "right",
      width: "sm",
      cell: (survey) => survey.questionCount ?? EMPTY_VALUE,
    },
    {
      key: "responses",
      header: "Responses",
      align: "right",
      width: "sm",
      sortable: true,
      sortValue: (survey) => survey.responseCount,
      cell: (survey) => survey.responseCount,
    },
    {
      key: "last",
      header: "Last activity",
      align: "right",
      width: "md",
      sortable: true,
      sortValue: (survey) => (survey.lastResponseAt ? new Date(survey.lastResponseAt).getTime() : null),
      cell: (survey) =>
        survey.lastResponseAt ? (
          <RelativeTime date={survey.lastResponseAt} align="right" className="text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground">{EMPTY_VALUE}</span>
        ),
    },
    ...(canManage ? [actionsColumn] : []),
  ];

  const { rows, sort, onSort } = useTableSort(filtered, columns);

  if (surveys.length === 0) {
    return <p className="type-body text-muted-foreground">No studies yet.</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterTabs
          label="Filter studies by status"
          tabs={FILTERS.map((f) => ({ ...f, count: statusCounts[f.value] }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search studies"
          label="Search studies by name"
        />
      </div>

      {/* Selection state appears only once a row is checked. Always mounted so
          the bar animates in and out instead of popping; the slot collapses
          to zero height while nothing is selected. Its dialogs portal to
          document.body, so overflow-hidden never clips them. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin-bottom] duration-200 ease-out motion-reduce:transition-none",
          canManage && selectedSurveys.length > 0
            ? "mb-3 grid-rows-[1fr] opacity-100"
            : "pointer-events-none mb-0 grid-rows-[0fr] opacity-0"
        )}
        aria-hidden={!canManage || selectedSurveys.length === 0}
      >
        <div className="overflow-hidden">
          {canManage && (
            <SurveyBulkActionsBar selected={selectedSurveys} onDone={() => setSelectedIds(new Set())} />
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(survey) => survey.id}
        rowHref={(survey) => `/admin/surveys/${survey.id}`}
        layout="fixed"
        sort={sort}
        onSort={onSort}
        empty={{ title: "No studies match." }}
      />
    </div>
  );
}
