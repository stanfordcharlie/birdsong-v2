"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SurveyRowActions } from "./SurveyRowActions";
import { SurveyBulkActionsBar } from "./SurveyBulkActionsBar";

export type SurveyListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  responseCount: number;
  createdAt: string;
  archivedAt: string | null;
};

type StatusFilter = "all" | "live" | "archived";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

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
      const isArchived = survey.archivedAt !== null;
      if (statusFilter === "archived") {
        if (!isArchived) return false;
      } else {
        // "All" and "Live" both exclude archived surveys — archived only
        // ever shows up under its own filter.
        if (isArchived) return false;
        if (statusFilter === "live" && survey.status !== "live") return false;
      }
      if (q && !survey.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [surveys, query, statusFilter]);

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

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));
  const someFilteredSelected = filtered.some((s) => selectedIds.has(s.id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

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
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="max-w-[320px] flex-1">
          <Input
            type="text"
            placeholder="Search surveys"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className={cn(
                  // h-9 matches the Input and Button defaults so the whole
                  // controls row sits on one consistent height.
                  "flex h-9 items-center rounded-control border px-3.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <Button asChild className="ml-auto">
          <Link href="/admin/surveys/new">New survey</Link>
        </Button>
      </div>

      {/* Always mounted — never conditionally added/removed — so this slot's
          height is identical whether or not anything is selected and the
          table below never reflows. Only opacity/pointer-events toggle;
          selecting/deselecting is a ~150ms crossfade, not a layout change. */}
      <div
        className={cn(
          "transition-opacity duration-150",
          selectedSurveys.length > 0 ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={selectedSurveys.length === 0}
      >
        <SurveyBulkActionsBar selected={selectedSurveys} onDone={() => setSelectedIds(new Set())} />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  ref={headerCheckboxRef}
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  aria-label="Select all surveys"
                />
              </TableHead>
              <TableHead>Internal name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No surveys match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((survey) => {
                const isArchived = survey.archivedAt !== null;
                return (
                  <TableRow key={survey.id} className="relative">
                    <TableCell className="w-10">
                      {/* relative z-10: same escape hatch as the actions
                          cell below — lifts the checkbox above the
                          row-spanning stretched-link span so it's actually
                          clickable instead of triggering row navigation. */}
                      <div className="relative z-10">
                        <Checkbox
                          checked={selectedIds.has(survey.id)}
                          onChange={() => toggleOne(survey.id)}
                          aria-label={`Select ${survey.title}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/surveys/${survey.id}`} className="text-[15px] font-medium text-card-foreground">
                        {/* Stretches to fill the whole row (position:relative
                            on TableRow above), so anywhere in the row is
                            clickable, not just this text. */}
                        <span className="absolute inset-0" />
                        {survey.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={survey.status === "live" ? "success" : "warning"}>
                          {survey.status === "live" ? "Live" : "Draft"}
                        </Badge>
                        {isArchived && <Badge variant="outline">Archived</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">{survey.responseCount}</TableCell>
                    <TableCell className="text-sm text-card-foreground">
                      {new Date(survey.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="w-10">
                      {/* relative z-10: lifts this above the row-spanning
                          stretched-link span in the first cell, so the
                          overflow button is actually clickable instead of
                          triggering row navigation. */}
                      <div className="relative z-10 flex justify-end">
                        <SurveyRowActions
                          surveyId={survey.id}
                          internalName={survey.title}
                          archivedAt={survey.archivedAt}
                          responseCount={survey.responseCount}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
