"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Card className="flex flex-col items-start gap-3 p-8">
        <p className="text-sm text-card-foreground">
          No surveys yet. Create one and Wren starts interviewing the moment you share the link —
          every completed conversation comes back scored, with a call script ready.
        </p>
        <Button asChild>
          <Link href="/admin/surveys/new">Create your first survey</Link>
        </Button>
      </Card>
    );
  }

  return (
    // No gap on the column: the bulk-bar slot between the controls and the
    // table owns its own bottom margin so it can collapse to nothing (see
    // below). Everything else spaces itself with explicit margins.
    <div className="flex flex-col">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* One segmented track rather than separate bordered chips: these
            are a single either/or choice, and the counts make the shape of
            the account readable without opening each tab. */}
        <div className="flex items-center gap-0.5 rounded-control bg-chip p-1">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                )}
              >
                {filter.label}
                <span className={cn("text-[12px]", active ? "text-muted-foreground" : "text-faint")}>
                  {statusCounts[filter.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative max-w-[300px] flex-1 basis-[220px]">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-faint"
          >
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <Input
            type="text"
            placeholder="Search surveys"
            aria-label="Search surveys by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-4">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleAllFiltered}
              className="text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-card-foreground"
            >
              {allFilteredSelected ? "Clear selection" : "Select all"}
            </button>
          )}
          <span className="whitespace-nowrap text-[12.5px] text-faint">{filtered.length} shown</span>
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
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No surveys match your search.
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
