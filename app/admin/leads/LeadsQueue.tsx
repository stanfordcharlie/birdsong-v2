"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusControl } from "@/components/StatusControl";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LeadItem = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  surveyId: string;
  surveyTitle: string;
  leadScore: number | null;
  // Company fit (lib/interview/company-fit.ts) — independent of leadScore.
  // fitConfidence: "high" | "medium" | "low" | "unavailable" | null (null =
  // not yet scored). fitScore is null when unavailable or not yet scored.
  fitScore: number | null;
  fitConfidence: string | null;
  fitReasoning: string | null;
  status: string;
  topPainPoint: string | null;
  createdAt: string;
  isTest: boolean;
  source: string | null;
};

// Which column the queue is sorted by. "default" keeps the server's order
// (lead_score desc, then newest). Score and Fit are click-to-sort.
type SortColumn = "default" | "score" | "fit";

type StatusFilter = "all" | "new" | "contacted" | "qualified" | "not_a_fit";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "not_a_fit", label: "Not a fit" },
];

// Same select styling as StatusControl / SurveyForm's native selects.
const SELECT_CLASSES =
  "flex h-9 rounded-control border border-input bg-card px-3 py-2 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Score bands mapped onto existing badge variants (DESIGN.md palette, no
// new colors): 9-10 green ("call now"), 7-8 amber (warm), 5-6 neutral
// chip, below 5 (and unscored) muted outline.
function scoreBadgeVariant(score: number | null): "success" | "warning" | "default" | "outline" {
  if (score === null) return "outline";
  if (score >= 9) return "success";
  if (score >= 7) return "warning";
  if (score >= 5) return "default";
  return "outline";
}

const HOT_SCORE_MIN = 7;
// Fit uses the same threshold and the same banding as the lead score, so the
// two columns read consistently and the "Fit 7+" filter mirrors "Score 7+".
const HOT_FIT_MIN = 7;

export function LeadsQueue({ items }: { items: LeadItem[] }) {
  // Local copy so inline status changes (StatusControl's optimistic update)
  // are reflected in the rows the filters below operate on.
  const [leads, setLeads] = useState(items);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [surveyFilter, setSurveyFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [fitHotOnly, setFitHotOnly] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("default");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Click a sortable header: first click sorts that column descending, a
  // second click flips to ascending, a third returns to the default order.
  function toggleSort(column: Exclude<SortColumn, "default">) {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortColumn("default");
      setSortDir("desc");
    }
  }

  // Only surveys that actually have completed responses can produce rows,
  // so the filter's options are derived from the rows themselves.
  const surveyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const lead of items) {
      if (!seen.has(lead.surveyId)) seen.set(lead.surveyId, lead.surveyTitle);
    }
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [items]);

  // Distinct, non-null source values actually present in this user's data.
  // Most accounts won't have any ?src= traffic yet, so the whole control
  // (not just an empty option list) is hidden until at least one exists.
  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const lead of items) {
      if (lead.source) seen.add(lead.source);
    }
    return Array.from(seen).sort();
  }, [items]);

  function handleStatusChange(leadId: string, status: string) {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = leads.filter((lead) => {
      if (!showTest && lead.isTest) return false;
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (surveyFilter !== "all" && lead.surveyId !== surveyFilter) return false;
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (hotOnly && (lead.leadScore ?? 0) < HOT_SCORE_MIN) return false;
      if (fitHotOnly && (lead.fitScore ?? 0) < HOT_FIT_MIN) return false;
      if (
        q &&
        ![lead.name, lead.email, lead.company].some((field) => field?.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });

    if (sortColumn === "default") return rows;
    // Nulls (unscored / no fit) always sort to the bottom regardless of
    // direction, so an asc sort surfaces the lowest real score, not blanks.
    const value = (lead: LeadItem) => (sortColumn === "score" ? lead.leadScore : lead.fitScore);
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [leads, query, statusFilter, surveyFilter, sourceFilter, hotOnly, fitHotOnly, showTest, sortColumn, sortDir]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-[320px] flex-1 basis-[240px]">
          <Input
            type="text"
            placeholder="Search leads"
            aria-label="Search leads by name, email, or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className={cn(
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
        <button
          type="button"
          onClick={() => setHotOnly((prev) => !prev)}
          aria-pressed={hotOnly}
          className={cn(
            "flex h-9 items-center rounded-control border px-3.5 text-[13px] font-medium transition-colors",
            hotOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
          )}
        >
          Score 7+
        </button>
        <button
          type="button"
          onClick={() => setFitHotOnly((prev) => !prev)}
          aria-pressed={fitHotOnly}
          className={cn(
            "flex h-9 items-center rounded-control border px-3.5 text-[13px] font-medium transition-colors",
            fitHotOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
          )}
        >
          Fit 7+
        </button>
        <select
          value={surveyFilter}
          onChange={(e) => setSurveyFilter(e.target.value)}
          aria-label="Filter by survey"
          className={SELECT_CLASSES}
        >
          <option value="all">All surveys</option>
          {surveyOptions.map((survey) => (
            <option key={survey.id} value={survey.id}>
              {survey.title}
            </option>
          ))}
        </select>
        {sourceOptions.length > 0 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source"
            className={SELECT_CLASSES}
          >
            <option value="all">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setShowTest((prev) => !prev)}
          aria-pressed={showTest}
          className={cn(
            "flex h-9 items-center rounded-control border px-3.5 text-[13px] font-medium transition-colors",
            showTest
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
          )}
        >
          Show test responses
        </button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Survey</TableHead>
              {sourceOptions.length > 0 && <TableHead>Source</TableHead>}
              <TableHead aria-sort={sortColumn === "score" ? (sortDir === "desc" ? "descending" : "ascending") : "none"}>
                <button
                  type="button"
                  onClick={() => toggleSort("score")}
                  className="inline-flex items-center gap-1 font-[inherit] text-inherit hover:text-card-foreground"
                >
                  Score
                  <span aria-hidden="true" className="text-[10px] text-muted-foreground">
                    {sortColumn === "score" ? (sortDir === "desc" ? "▼" : "▲") : "↕"}
                  </span>
                </button>
              </TableHead>
              <TableHead aria-sort={sortColumn === "fit" ? (sortDir === "desc" ? "descending" : "ascending") : "none"}>
                <button
                  type="button"
                  onClick={() => toggleSort("fit")}
                  className="inline-flex items-center gap-1 font-[inherit] text-inherit hover:text-card-foreground"
                  title="Company fit: how well this company matches your ICP, scored separately from lead score."
                >
                  Fit
                  <span aria-hidden="true" className="text-[10px] text-muted-foreground">
                    {sortColumn === "fit" ? (sortDir === "desc" ? "▼" : "▲") : "↕"}
                  </span>
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Top pain point</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={sourceOptions.length > 0 ? 9 : 8}
                  className="text-center text-sm text-muted-foreground"
                >
                  No leads match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id} className="relative">
                  <TableCell>
                    <Link
                      href={`/admin/responses/${lead.id}`}
                      className="font-medium text-card-foreground hover:text-primary"
                    >
                      {/* Stretches to fill the whole row (position:relative
                          on TableRow above), so anywhere in the row is
                          clickable — interactive cells below sit over it
                          with relative z-10, same as SurveysList's copy
                          button. */}
                      <span className="absolute inset-0" />
                      {lead.name || "—"}
                    </Link>
                    {lead.isTest && (
                      <Badge variant="warning" className="ml-2">
                        Test
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.company || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.surveyTitle}</TableCell>
                  {sourceOptions.length > 0 && (
                    <TableCell className="text-muted-foreground">{lead.source || "—"}</TableCell>
                  )}
                  <TableCell>
                    <Badge variant={scoreBadgeVariant(lead.leadScore)}>
                      {lead.leadScore ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.fitConfidence === "unavailable" ? (
                      <span className="text-muted-foreground" title="Company fit research was unavailable.">
                        —
                      </span>
                    ) : lead.fitScore !== null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge variant={scoreBadgeVariant(lead.fitScore)} title={lead.fitReasoning ?? undefined}>
                          {lead.fitScore}
                        </Badge>
                        {lead.fitConfidence === "low" && (
                          <span
                            className="text-[11px] text-muted-foreground"
                            title="Limited data — low-confidence estimate."
                          >
                            limited data
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground" title="Not yet scored.">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="relative z-10 inline-flex">
                      <StatusControl
                        responseId={lead.id}
                        initialStatus={lead.status}
                        onStatusChange={(status) => handleStatusChange(lead.id, status)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span
                      className="block max-w-[260px] truncate"
                      title={lead.topPainPoint ?? undefined}
                    >
                      {lead.topPainPoint || "—"}
                    </span>
                  </TableCell>
                  {/* suppressHydrationWarning: relative time is computed
                      from Date.now(), which can differ between the server
                      render and hydration across a minute boundary. */}
                  <TableCell className="text-[13px] text-muted-foreground" suppressHydrationWarning>
                    {formatRelativeTime(lead.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
