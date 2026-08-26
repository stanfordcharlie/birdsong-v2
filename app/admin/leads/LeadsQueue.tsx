"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusControl } from "@/components/StatusControl";
import { SurveyFilterCards, type SurveyCard } from "./SurveyFilterCards";
import { formatRelativeTime } from "@/lib/format";
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
  /** Whether the survey behind this lead is still collecting responses. */
  surveyIsLive: boolean;
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

// Avatar initials, same derivation as the admin home's activity feed.
function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A 1-10 score read as a short bar plus the number. The bar is what makes a
// column of scores scannable without reading any of them; the number is what
// you check once the bar has pointed you at a row.
//
// `tone="lead"` colours the fill by band so hot leads carry green down the
// column. Fit stays neutral in every band — two green columns side by side
// and neither one reads as the signal.
function ScoreMeter({ score, tone }: { score: number; tone: "lead" | "fit" }) {
  const hot = tone === "lead" && score >= HOT_SCORE_MIN;
  const mid = tone === "lead" && score >= 5;
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="h-[4px] w-[26px] overflow-hidden rounded-full bg-chip">
        <span
          className={cn(
            "block h-full rounded-full",
            hot ? "bg-success" : mid ? "bg-muted-foreground" : "bg-faint"
          )}
          style={{ width: `${Math.max(0, Math.min(score, 10)) * 10}%` }}
        />
      </span>
      <span
        className={cn(
          "text-[13.5px] font-semibold tabular-nums",
          hot ? "text-success" : "text-card-foreground"
        )}
      >
        {score}
      </span>
    </span>
  );
}

const HOT_SCORE_MIN = 7;
// Fit uses the same threshold and the same banding as the lead score, so the
// two columns read consistently and the "Fit 7+" filter mirrors "Score 7+".
const HOT_FIT_MIN = 7;

export function LeadsQueue({
  items,
  initialStatusFilter = "all",
}: {
  items: LeadItem[];
  // Deep-link from the admin home's "New leads awaiting contact" stat, e.g.
  // ?status=new. Any value that isn't a recognized filter falls back to "all".
  initialStatusFilter?: StatusFilter;
}) {
  // Local copy so inline status changes (StatusControl's optimistic update)
  // are reflected in the rows the filters below operate on.
  const [leads, setLeads] = useState(items);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  // null = the "All surveys" card. Driven by SurveyFilterCards above the
  // queue, which replaced the toolbar's survey <select>.
  const [surveyFilter, setSurveyFilter] = useState<string | null>(null);
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

  // "All" is the no-filter choice, so clicking it also releases the Score 7+
  // and Fit 7+ toggles sitting beside it. Without that, All can be lit up
  // while two narrowing toggles are still on and the queue reads as empty
  // for no visible reason. Every other status is a narrowing choice and
  // leaves the toggles exactly as they were.
  function selectStatus(value: StatusFilter) {
    setStatusFilter(value);
    if (value === "all") {
      setHotOnly(false);
      setFitHotOnly(false);
    }
  }

  // Everything the cards and the tabs count is measured against this set:
  // every lead the user can currently see, before any of the narrowing
  // filters. Only the test toggle applies, because a hidden test row
  // shouldn't be counted in a number sitting next to visible rows.
  const visibleLeads = useMemo(
    () => (showTest ? leads : leads.filter((lead) => !lead.isTest)),
    [leads, showTest]
  );

  // A lead is worth a call at 7+ and still untouched — the same cutoff the
  // admin home, the Slack notification and the HubSpot deal threshold use.
  const worthACall = (lead: LeadItem) =>
    (lead.leadScore ?? 0) >= HOT_SCORE_MIN && lead.status === "new";

  // Only surveys that actually have completed responses can produce rows, so
  // the cards are derived from the rows themselves rather than from the
  // survey list — a survey nobody has finished has nothing to show here.
  const surveyCards = useMemo<SurveyCard[]>(() => {
    const bySurvey = new Map<string, SurveyCard>();
    for (const lead of visibleLeads) {
      let card = bySurvey.get(lead.surveyId);
      if (!card) {
        card = {
          id: lead.surveyId,
          title: lead.surveyTitle,
          leadCount: 0,
          worthACall: 0,
          share: 0,
          isLive: lead.surveyIsLive,
        };
        bySurvey.set(lead.surveyId, card);
      }
      card.leadCount += 1;
      if (worthACall(lead)) card.worthACall += 1;
    }

    const total = visibleLeads.length;
    const cards = Array.from(bySurvey.values())
      // Most leads first: the survey producing the most pipeline is the one
      // worth landing on, and it keeps the row's order stable as statuses
      // change underneath it (which worth-a-call ordering would not).
      .sort((a, b) => b.leadCount - a.leadCount)
      .map((card) => ({ ...card, share: total > 0 ? card.leadCount / total : 0 }));

    return [
      {
        id: null,
        title: "All surveys",
        leadCount: total,
        worthACall: visibleLeads.filter(worthACall).length,
        share: 1,
        // Green while anything is still collecting.
        isLive: cards.some((card) => card.isLive),
      },
      ...cards,
    ];
  }, [visibleLeads]);

  // The survey card is the outermost filter: the header count, the subline and
  // every status tab count all restate whatever it has selected.
  const scopedLeads = useMemo(
    () =>
      surveyFilter === null
        ? visibleLeads
        : visibleLeads.filter((lead) => lead.surveyId === surveyFilter),
    [visibleLeads, surveyFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: scopedLeads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      not_a_fit: 0,
    };
    for (const lead of scopedLeads) {
      if (lead.status in counts) counts[lead.status as StatusFilter] += 1;
    }
    return counts;
  }, [scopedLeads]);

  const awaitingReply = useMemo(
    () => scopedLeads.filter(worthACall).length,
    [scopedLeads]
  );

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
    const rows = scopedLeads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
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
  }, [scopedLeads, query, statusFilter, sourceFilter, hotOnly, fitHotOnly, sortColumn, sortDir]);

  return (
    <div className="flex flex-col gap-5">
      {/* Masthead. The count chip and the subline both restate the selected
          survey card, which is why they live in here rather than on the
          server page. */}
      <div className="flex flex-col gap-2">
        <span className="type-label">Leads</span>
        <div className="flex items-center gap-3">
          <h1 className="type-page-title">Your lead queue</h1>
          <span className="rounded-control bg-chip px-2.5 py-1 text-[13px] font-semibold text-muted-foreground">
            {statusCounts.all}
          </span>
        </div>
        <p className="text-[15px] text-muted-foreground">
          {awaitingReply === 0
            ? "Nobody is waiting on a reply right now."
            : `${awaitingReply} scored ${HOT_SCORE_MIN} or higher and ${
                awaitingReply === 1 ? "has" : "have"
              } not heard back yet.`}
        </p>
      </div>

      <SurveyFilterCards
        cards={surveyCards}
        selectedId={surveyFilter}
        onSelect={setSurveyFilter}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs as one segmented track rather than five separate
            bordered buttons: they are a single either/or choice, and the
            counts make that much easier to read at a glance. */}
        <div className="flex items-center gap-0.5 rounded-control bg-chip p-1">
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => selectStatus(filter.value)}
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
            placeholder="Name, company, keyword"
            aria-label="Search leads by name, email, or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

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

        {/* Kept as explicit toggles rather than folded into the mock's generic
            "+ Filter" button: all three already work, and hiding working
            filters behind a menu would cost function for nothing. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: `Score ${HOT_SCORE_MIN}+`, on: hotOnly, toggle: () => setHotOnly((p) => !p) },
            { label: `Fit ${HOT_FIT_MIN}+`, on: fitHotOnly, toggle: () => setFitHotOnly((p) => !p) },
            { label: "Show test", on: showTest, toggle: () => setShowTest((p) => !p) },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.toggle}
              aria-pressed={chip.on}
              className={cn(
                "flex h-9 items-center rounded-control border px-3.5 text-[13px] font-medium transition-colors",
                chip.on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
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
              <TableHead>Signal</TableHead>
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
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-success-bg text-[11.5px] font-bold text-success"
                      >
                        {initialsOf(lead.name)}
                      </span>
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
                      {lead.isTest && <Badge variant="warning">Test</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.company || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.surveyTitle}</TableCell>
                  {sourceOptions.length > 0 && (
                    <TableCell className="text-muted-foreground">{lead.source || "—"}</TableCell>
                  )}
                  <TableCell>
                    {lead.leadScore === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ScoreMeter score={lead.leadScore} tone="lead" />
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.fitConfidence === "unavailable" ? (
                      <span className="text-muted-foreground" title="Company fit research was unavailable.">
                        —
                      </span>
                    ) : lead.fitScore !== null ? (
                      <span className="inline-flex items-center gap-1.5" title={lead.fitReasoning ?? undefined}>
                        <ScoreMeter score={lead.fitScore} tone="fit" />
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
