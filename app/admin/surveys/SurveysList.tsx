"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, FilterTabs, SearchInput } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { SurveyCard } from "./SurveyCard";
import { SurveyBulkActionsBar } from "./SurveyBulkActionsBar";

export type SurveyListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  /** survey.num_questions — the target topic count, null on older rows. */
  questionCount: number | null;
  responseCount: number;
  /** Seven daily counts, oldest first, for the card's sparkline. */
  responsesByDay: number[];
  lastResponseAt: string | null;
  /** Newest answerers first, capped server-side, for the card's avatars. */
  recentRespondents: string[];
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

// Shared by the tab counts and the grid so a tab can never promise a number
// the grid then contradicts.
function matchesStatus(survey: SurveyListItem, filter: StatusFilter): boolean {
  const isArchived = survey.archivedAt !== null;
  // "All", "Live" and "Draft" all exclude archived surveys — archived only
  // ever shows up under its own tab.
  if (filter === "archived") return isArchived;
  if (isArchived) return false;
  if (filter === "live") return survey.status === "live";
  if (filter === "draft") return survey.status !== "live";
  return true;
}

export function SurveysList({
  surveys,
  initialStatusFilter = "all",
}: {
  surveys: SurveyListItem[];
  // Deep-link from the admin home's "Live surveys" stat, e.g. ?status=live.
  initialStatusFilter?: StatusFilter;
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
  // carried across tabs would be confusing — clear it on tab change.
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

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const s of filtered) next.delete(s.id);
        return next;
      }
      const next = new Set(prev);
      for (const s of filtered) next.add(s.id);
      return next;
    });
  }

  if (surveys.length === 0) {
    return (
      <Card padding="flush">
        <EmptyState
          title="No surveys yet"
          description="Create one and Wren starts interviewing the moment you share the link. Every completed conversation comes back scored, with a call script ready."
          action={
            <Button asChild>
              <Link href="/admin/surveys/new">Create your first survey</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    // No gap on the column: the bulk-bar slot between the controls and the
    // table owns its own bottom margin so it can collapse to nothing (see
    // below). Everything else spaces itself with explicit margins.
    <div className="flex flex-col">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterTabs
          label="Filter surveys by status"
          tabs={FILTERS.map((f) => ({ ...f, count: statusCounts[f.value] }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search surveys"
          label="Search surveys by name"
        />

        <div className="ml-auto flex items-center gap-4">
          {filtered.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={toggleAllFiltered}>
              {allFilteredSelected ? "Clear selection" : "Select all"}
            </Button>
          )}
          <span className="type-body-sm whitespace-nowrap text-faint">{filtered.length} shown</span>
        </div>
      </div>

      {/* Always mounted — never conditionally added/removed — so the bar
          animates in and out instead of popping. Reserving its full height
          while nothing is selected would be a permanent empty band under
          the controls, which is the state this page is in almost all the
          time, so the slot collapses to zero instead: the 0fr/1fr row is
          what makes that a smooth open/close rather than a hard reflow, and
          the bottom margin rides along so the gap collapses with it.
          overflow-hidden clips the bar mid-transition; its dialogs portal to
          document.body, so they're never caught by it. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin-bottom] duration-200 ease-out motion-reduce:transition-none",
          selectedSurveys.length > 0
            ? "mb-5 grid-rows-[1fr] opacity-100"
            : "pointer-events-none mb-0 grid-rows-[0fr] opacity-0"
        )}
        aria-hidden={selectedSurveys.length === 0}
      >
        <div className="overflow-hidden">
          <SurveyBulkActionsBar selected={selectedSurveys} onDone={() => setSelectedIds(new Set())} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card padding="flush">
          <EmptyState
            title="No surveys match your search"
            description="Try a different name, or clear the filters above."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              selected={selectedIds.has(survey.id)}
              onToggleSelect={() => toggleOne(survey.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
