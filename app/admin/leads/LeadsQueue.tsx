"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FilterTabs,
  PageHeader,
  SearchInput,
  type Column,
} from "@/components/admin/ui";
import { StatusControl } from "@/components/StatusControl";
import { SurveyFilterCards, type SurveyCard } from "./SurveyFilterCards";
import { EMPTY_VALUE, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  "focus-ring flex h-9 rounded-control border border-input bg-card px-3 py-2 font-archivo text-sm text-card-foreground";

// Avatar initials, same derivation as the admin home's activity feed.
function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return EMPTY_VALUE;
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
      <span aria-hidden className="h-[4px] w-[26px] overflow-hidden rounded-pill bg-chip">
        <span
          className={cn(
            "block h-full rounded-pill",
            hot ? "bg-brand" : mid ? "bg-muted-foreground" : "bg-faint"
          )}
          style={{ width: `${Math.max(0, Math.min(score, 10)) * 10}%` }}
        />
      </span>
      <span
        className={cn(
          "type-body-sm font-semibold tabular-nums",
          hot ? "text-brand" : "text-card-foreground"
        )}
      >
        {score}
      </span>
    </span>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  dir: "desc" | "asc";
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="focus-ring inline-flex items-center gap-1 rounded-control font-[inherit] text-inherit hover:text-card-foreground"
    >
      {label}
      <span aria-hidden="true" className="text-micro text-muted-foreground">
        {active ? (dir === "desc" ? "▼" : "▲") : "↕"}
      </span>
    </button>
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

  // Built here rather than at module scope so the sortable headers can close
  // over the current sort state, and so the Source column can drop out
  // entirely when this account has no tagged traffic.
  const columns: Column<LeadItem>[] = [
    {
      key: "name",
      header: "Name",
      cell: (lead) => (
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-pill bg-brand-weak font-archivo text-micro font-bold text-brand-text"
          >
            {initialsOf(lead.name)}
          </span>
          <span className="font-medium">{lead.name || EMPTY_VALUE}</span>
          {lead.isTest && <Badge variant="warning" size="sm">Test</Badge>}
        </span>
      ),
    },
    { key: "company", header: "Company", cell: (lead) => <span className="text-muted-foreground">{lead.company || EMPTY_VALUE}</span> },
    { key: "survey", header: "Survey", cell: (lead) => <span className="text-muted-foreground">{lead.surveyTitle}</span> },
    ...(sourceOptions.length > 0
      ? [{ key: "source", header: "Source", cell: (lead: LeadItem) => <span className="text-muted-foreground">{lead.source || EMPTY_VALUE}</span> }]
      : []),
    {
      key: "score",
      header: <SortHeader label="Score" active={sortColumn === "score"} dir={sortDir} onClick={() => toggleSort("score")} />,
      ariaSort: sortColumn === "score" ? (sortDir === "desc" ? "descending" : "ascending") : "none",
      width: "110px",
      cell: (lead) =>
        lead.leadScore === null ? (
          <span className="text-muted-foreground">{EMPTY_VALUE}</span>
        ) : (
          <ScoreMeter score={lead.leadScore} tone="lead" />
        ),
    },
    {
      key: "fit",
      header: (
        <SortHeader
          label="Fit"
          active={sortColumn === "fit"}
          dir={sortDir}
          onClick={() => toggleSort("fit")}
          title="Company fit: how well this company matches your ICP, scored separately from lead score."
        />
      ),
      ariaSort: sortColumn === "fit" ? (sortDir === "desc" ? "descending" : "ascending") : "none",
      width: "150px",
      cell: (lead) =>
        lead.fitConfidence === "unavailable" ? (
          <span className="text-muted-foreground" title="Company fit research was unavailable.">
            {EMPTY_VALUE}
          </span>
        ) : lead.fitScore !== null ? (
          <span className="inline-flex items-center gap-1.5" title={lead.fitReasoning ?? undefined}>
            <ScoreMeter score={lead.fitScore} tone="fit" />
            {lead.fitConfidence === "low" && (
              <span className="text-micro text-muted-foreground" title="Limited data, low-confidence estimate.">
                limited data
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground" title="Not yet scored.">
            {EMPTY_VALUE}
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (lead) => (
        <StatusControl
          responseId={lead.id}
          initialStatus={lead.status}
          onStatusChange={(status) => handleStatusChange(lead.id, status)}
        />
      ),
    },
    {
      key: "signal",
      header: "Signal",
      cell: (lead) => (
        <span className="block max-w-[260px] truncate text-muted-foreground" title={lead.topPainPoint ?? undefined}>
          {lead.topPainPoint || EMPTY_VALUE}
        </span>
      ),
    },
    {
      key: "completed",
      header: "Completed",
      align: "right",
      width: "116px",
      // suppressHydrationWarning: relative time is computed from Date.now(),
      // which can differ between the server render and hydration across a
      // minute boundary.
      cell: (lead) => (
        <span className="text-muted-foreground" suppressHydrationWarning>
          {formatRelativeTime(lead.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* The count chip and the subline both restate the selected survey card,
          which is why the masthead lives in here rather than on the server
          page. It still renders the shared PageHeader. */}
      <PageHeader
        eyebrow="Leads"
        title="Your lead queue"
        badge={<Badge variant="count">{statusCounts.all}</Badge>}
        subtitle={
          awaitingReply === 0
            ? "Nobody is waiting on a reply right now."
            : `${awaitingReply} scored ${HOT_SCORE_MIN} or higher and ${
                awaitingReply === 1 ? "has" : "have"
              } not heard back yet.`
        }
      />

      <div className="mb-5">
        <SurveyFilterCards cards={surveyCards} selectedId={surveyFilter} onSelect={setSurveyFilter} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterTabs
          label="Filter leads by status"
          tabs={STATUS_FILTERS.map((f) => ({ ...f, count: statusCounts[f.value] }))}
          value={statusFilter}
          onChange={selectStatus}
        />

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Name, company, keyword"
          label="Search leads by name, email, or company"
        />

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

        {/* Kept as explicit toggles rather than folded into a generic
            "+ Filter" menu: all three already work, and hiding working
            filters behind a menu would cost function for nothing. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: `Score ${HOT_SCORE_MIN}+`, on: hotOnly, toggle: () => setHotOnly((p) => !p) },
            { label: `Fit ${HOT_FIT_MIN}+`, on: fitHotOnly, toggle: () => setFitHotOnly((p) => !p) },
            { label: "Show test", on: showTest, toggle: () => setShowTest((p) => !p) },
          ].map((chip) => (
            <Button
              key={chip.label}
              type="button"
              size="sm"
              variant={chip.on ? "primary" : "secondary"}
              onClick={chip.toggle}
              aria-pressed={chip.on}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      <Card padding="flush">
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(lead) => lead.id}
          rowHref={(lead) => `/admin/responses/${lead.id}`}
          empty={{
            title: "No leads match your filters",
            description: "Try a different search, or clear the filters above.",
          }}
        />
      </Card>
    </>
  );
}
