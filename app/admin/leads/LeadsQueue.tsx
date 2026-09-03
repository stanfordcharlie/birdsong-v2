"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  DataTable,
  FilterTabs,
  RelativeTime,
  ScoreBadge,
  SearchInput,
  StatRow,
  useTableSort,
  type Column,
} from "@/components/admin/ui";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { SurveyFilterCards, type SurveyCard } from "./SurveyFilterCards";
import { EMPTY_VALUE } from "@/lib/format";
import { isWorthACall, WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { isClosedStatus, type LeadStatus } from "@/lib/leads/state";
import { assignLead, claimLead, unassignLead, type LeadActionResult } from "@/lib/leads/actions";

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
  // Company fit (lib/interview/company-fit.ts), independent of leadScore.
  // fitConfidence: "high" | "medium" | "low" | "unavailable" | null (null =
  // not yet scored). fitScore is null when unavailable or not yet scored.
  fitScore: number | null;
  fitConfidence: string | null;
  fitReasoning: string | null;
  leadStatus: LeadStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  lastActivityAt: string;
  topPainPoint: string | null;
  createdAt: string;
  isTest: boolean;
  source: string | null;
};

export type QueueMember = { id: string; name: string };

export type QueuePermissions = {
  claim: boolean;
  assignOthers: boolean;
};

const QUEUE_TABS = ["all", "unworked", "mine", "contacted", "meetings", "closed"] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

export function isQueueTab(value: unknown): value is QueueTab {
  return typeof value === "string" && (QUEUE_TABS as readonly string[]).includes(value);
}

const TAB_LABELS: Record<QueueTab, string> = {
  all: "All",
  unworked: "Unworked",
  mine: "Mine",
  contacted: "Contacted",
  meetings: "Meetings",
  closed: "Closed",
};

// One sentence per tab, each naming the situation it is actually in. "No
// leads yet" and "Nothing assigned to you" are different problems with
// different fixes, so they must not share a line.
const TAB_EMPTY: Record<QueueTab, string> = {
  all: "No leads yet. Completed interviews land here.",
  unworked: "Nothing waiting. Every lead has been picked up.",
  mine: "Nothing assigned to you. Claim a lead from Unworked to start working it.",
  contacted: "No leads have been contacted yet.",
  meetings: "No meetings booked yet.",
  closed: "No leads have been closed yet.",
};

function tabMatches(lead: LeadItem, tab: QueueTab, me: string): boolean {
  switch (tab) {
    case "all":
      return true;
    case "unworked":
      return lead.leadStatus === "new";
    case "mine":
      return lead.assignedTo !== null && lead.assignedTo === me;
    case "contacted":
      return lead.leadStatus === "contacted";
    case "meetings":
      return lead.leadStatus === "meeting_booked";
    case "closed":
      return isClosedStatus(lead.leadStatus);
  }
}

// Same select styling as the team settings' native selects, at the in-row
// size the queue's status select used to take.
const SELECT_CLASSES =
  "focus-ring flex h-9 rounded-control border border-input bg-card px-3 py-2 font-archivo text-sm text-card-foreground";
const ROW_SELECT_CLASSES =
  "focus-ring flex h-8 max-w-full rounded-pill border border-border bg-card px-3 font-archivo text-control text-card-foreground disabled:cursor-not-allowed disabled:opacity-50";

// The sources select doubles as the data-source switch. "Include test
// responses" used to be a third chip sitting beside the two lead filters,
// which made a question about which rows exist look like a question about
// which leads are hot.
const TEST_SOURCE_VALUE = "__include_test__";

// Fit uses the same threshold and the same banding as the lead score, so the
// two columns read consistently and the "Fit 7+" filter mirrors "Score 7+".
const HOT_FIT_MIN = 7;

export function LeadsQueue({
  items,
  members,
  currentUserId,
  permissions,
  initialTab,
}: {
  items: LeadItem[];
  /** The org's members, for the assign-to control and the assignee column. */
  members: QueueMember[];
  currentUserId: string;
  permissions: QueuePermissions;
  /** Decided on the server: Mine when the rep holds anything, else Unworked. */
  initialTab: QueueTab;
}) {
  const router = useRouter();
  // Local copy so a claim or assignment is reflected in the row the moment
  // the action returns, ahead of the server re-render router.refresh asks for.
  const [leads, setLeads] = useState(items);
  useEffect(() => setLeads(items), [items]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<QueueTab>(initialTab);
  // null = the "All studies" chip. Driven by SurveyFilterCards above the
  // queue, which replaced the toolbar's survey <select>.
  const [surveyFilter, setSurveyFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [fitHotOnly, setFitHotOnly] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // "All" is the no-filter choice, so clicking it also releases the Score 7+
  // and Fit 7+ toggles sitting beside it. Without that, All can be lit up
  // while two narrowing toggles are still on and the queue reads as empty
  // for no visible reason. Every other tab is a narrowing choice and leaves
  // the toggles exactly as they were.
  function selectTab(value: QueueTab) {
    setTab(value);
    if (value === "all") {
      setHotOnly(false);
      setFitHotOnly(false);
    }
  }

  // Everything the chips, the stats and the tabs count is measured against
  // this set: every lead the user can currently see, before any of the
  // narrowing filters. Only the test toggle applies, because a hidden test
  // row shouldn't be counted in a number sitting next to visible rows.
  const visibleLeads = useMemo(
    () => (showTest ? leads : leads.filter((lead) => !lead.isTest)),
    [leads, showTest]
  );

  // Only surveys that actually have completed responses can produce rows, so
  // the chips are derived from the rows themselves rather than from the
  // survey list: a survey nobody has finished has nothing to show here.
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
          isLive: lead.surveyIsLive,
        };
        bySurvey.set(lead.surveyId, card);
      }
      card.leadCount += 1;
      if (isWorthACall({ leadScore: lead.leadScore, status: lead.leadStatus })) card.worthACall += 1;
    }

    // Most leads first: the survey producing the most pipeline is the one
    // worth landing on, and it keeps the row's order stable as statuses
    // change underneath it (which worth-a-call ordering would not).
    const cards = Array.from(bySurvey.values()).sort((a, b) => b.leadCount - a.leadCount);

    return [
      {
        id: null,
        title: "All studies",
        leadCount: visibleLeads.length,
        worthACall: visibleLeads.filter((lead) =>
          isWorthACall({ leadScore: lead.leadScore, status: lead.leadStatus })
        ).length,
        // Live while anything is still collecting.
        isLive: cards.some((card) => card.isLive),
      },
      ...cards,
    ];
  }, [visibleLeads]);

  // A selected study that has since disappeared from the cards (archived,
  // or its last lead switched to test) would leave the queue scoped to
  // nothing. Fall back to the all-studies view instead of an empty state.
  useEffect(() => {
    if (surveyFilter !== null && !surveyCards.some((card) => card.id === surveyFilter)) {
      setSurveyFilter(null);
    }
  }, [surveyCards, surveyFilter]);

  // The study chip is the outermost filter: the stats and every tab count
  // restate whatever it has selected.
  const scopedLeads = useMemo(
    () =>
      surveyFilter === null
        ? visibleLeads
        : visibleLeads.filter((lead) => lead.surveyId === surveyFilter),
    [visibleLeads, surveyFilter]
  );

  const tabCounts = useMemo(() => {
    const counts = Object.fromEntries(QUEUE_TABS.map((t) => [t, 0])) as Record<QueueTab, number>;
    for (const lead of scopedLeads) {
      for (const t of QUEUE_TABS) {
        if (tabMatches(lead, t, currentUserId)) counts[t] += 1;
      }
    }
    return counts;
  }, [scopedLeads, currentUserId]);

  const stats = useMemo(() => {
    const byStatus = (status: LeadStatus) =>
      scopedLeads.filter((lead) => lead.leadStatus === status).length;
    return [
      { label: "Unworked", value: byStatus("new") },
      { label: "Assigned to me", value: tabCounts.mine },
      { label: "Contacted", value: byStatus("contacted") },
      { label: "Meetings booked", value: byStatus("meeting_booked") },
      { label: "Qualified", value: byStatus("qualified") },
    ];
  }, [scopedLeads, tabCounts.mine]);

  // Distinct, non-null source values actually present in this user's data.
  // Most accounts won't have any ?src= traffic yet, so the source options are
  // hidden until at least one exists, but the select itself stays, because
  // it now also carries the include-test-responses switch.
  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const lead of items) {
      if (lead.source) seen.add(lead.source);
    }
    return Array.from(seen).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedLeads.filter((lead) => {
      if (!tabMatches(lead, tab, currentUserId)) return false;
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (hotOnly && (lead.leadScore ?? 0) < WORTH_A_CALL_SCORE_MIN) return false;
      if (fitHotOnly && (lead.fitScore ?? 0) < HOT_FIT_MIN) return false;
      if (
        q &&
        ![lead.name, lead.email, lead.company].some((field) => field?.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [scopedLeads, query, tab, currentUserId, sourceFilter, hotOnly, fitHotOnly]);

  // One action in flight at a time per row. The row updates from the
  // action's own result, then the page re-renders from the server so the
  // trail, the stats and every other tab agree with it.
  async function runAction(leadId: string, action: () => Promise<LeadActionResult>) {
    setActionError(null);
    setPendingId(leadId);
    try {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                leadStatus: result.status,
                assignedTo: result.assignedTo,
                assigneeName: result.assigneeName,
                lastActivityAt: new Date().toISOString(),
              }
            : lead
        )
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  function handleAssignSelect(lead: LeadItem, value: string) {
    if (value === "") return runAction(lead.id, () => unassignLead(lead.id));
    if (value === currentUserId) return runAction(lead.id, () => claimLead(lead.id));
    return runAction(lead.id, () => assignLead(lead.id, value));
  }

  // A column that is the same dash on every row is not a column. Fit is shown
  // only once something in scope has actually been scored for it (it was
  // seventeen dashes on this account), and Study goes away the moment a
  // single study card is selected, because the study is already the context.
  //
  // Measured against the study scope rather than the fully filtered rows on
  // purpose: keying it off the filtered set lets the Fit 7+ toggle empty the
  // table, hide the Fit column, and take its own off-switch with it.
  const showFitColumn = scopedLeads.some((lead) => lead.fitScore !== null);
  const showStudyColumn = surveyFilter === null;
  const showActionColumn = permissions.claim || permissions.assignOthers;

  const studyColumn: Column<LeadItem> = {
    key: "survey",
    header: "Study",
    width: 0.14,
    truncate: true,
    title: (lead) => lead.surveyTitle,
    cell: (lead) => <span className="text-muted-foreground">{lead.surveyTitle}</span>,
  };

  const fitColumn: Column<LeadItem> = {
    key: "fit",
    header: "Fit",
    align: "center",
    width: "xs",
    sortable: true,
    sortValue: (lead) => lead.fitScore,
    cell: (lead) => (
      <span
        title={
          lead.fitConfidence === "unavailable"
            ? "Company fit research was unavailable."
            : (lead.fitReasoning ?? undefined)
        }
      >
        <ScoreBadge score={lead.fitScore} />
      </span>
    ),
  };

  // The documented pattern for an interactive cell inside a linked row: the
  // control keeps its pointer events (DataTable) and the click stops here.
  // See the DataTable entry on /admin/styleguide.
  const actionColumn: Column<LeadItem> = {
    key: "assign",
    header: "Assign",
    width: "lg",
    cell: (lead) => {
      const pending = pendingId === lead.id;
      return (
        <span
          className="flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {permissions.claim && !lead.assignedTo && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => runAction(lead.id, () => claimLead(lead.id))}
            >
              {pending ? "Claiming" : "Claim"}
            </Button>
          )}
          {permissions.assignOthers && (
            <select
              value={lead.assignedTo ?? ""}
              disabled={pending}
              onChange={(event) => handleAssignSelect(lead, event.target.value)}
              aria-label={`Assign ${lead.name || "this lead"} to a teammate`}
              className={ROW_SELECT_CLASSES}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === currentUserId ? "Me" : member.name}
                </option>
              ))}
            </select>
          )}
        </span>
      );
    },
  };

  const columns: Column<LeadItem>[] = [
    {
      key: "name",
      header: "Respondent",
      width: showStudyColumn ? 0.18 : 0.26,
      truncate: true,
      title: (lead) => lead.name ?? undefined,
      cell: (lead) => (
        <span className="whitespace-nowrap">
          <span className="align-middle font-medium">{lead.name || EMPTY_VALUE}</span>
          {lead.isTest && (
            <Badge variant="warning" size="sm" className="ml-2 align-middle">
              Test
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "company",
      header: "Company",
      width: showStudyColumn ? 0.14 : 0.2,
      truncate: true,
      title: (lead) => lead.company ?? undefined,
      cell: (lead) => (
        <span className="text-muted-foreground">{lead.company || EMPTY_VALUE}</span>
      ),
    },
    ...(showStudyColumn ? [studyColumn] : []),
    {
      key: "score",
      header: "Score",
      align: "center",
      width: "xs",
      sortable: true,
      sortValue: (lead) => lead.leadScore,
      cell: (lead) => <ScoreBadge score={lead.leadScore} />,
    },
    ...(showFitColumn ? [fitColumn] : []),
    {
      key: "status",
      header: "Status",
      width: "md",
      cell: (lead) => <LeadStatusBadge status={lead.leadStatus} size="sm" />,
    },
    {
      key: "assignee",
      header: "Assignee",
      width: 0.12,
      truncate: true,
      title: (lead) => lead.assigneeName ?? undefined,
      cell: (lead) => (
        <span className={lead.assigneeName ? undefined : "text-muted-foreground"}>
          {lead.assignedTo === currentUserId ? "Me" : (lead.assigneeName ?? EMPTY_VALUE)}
        </span>
      ),
    },
    {
      key: "activity",
      header: "Last activity",
      align: "right",
      // md, not sm: the header is sortable, and its chevron plus the
      // uppercase tracked label does not fit in the smaller step.
      width: "md",
      sortable: true,
      sortValue: (lead) => new Date(lead.lastActivityAt).getTime(),
      cell: (lead) => (
        <RelativeTime date={lead.lastActivityAt} align="right" className="text-muted-foreground" />
      ),
    },
    ...(showActionColumn ? [actionColumn] : []),
  ];

  // The server hands rows back score-desc, then most recently touched, which
  // is the order this queue is meant to be worked in, so the default sort is
  // no sort.
  const { rows, sort, onSort } = useTableSort(filtered, columns);

  // The tab's own sentence when the tab is genuinely empty; the filter
  // sentence when it is the search or a toggle that emptied it.
  const emptyTitle = tabCounts[tab] === 0 ? TAB_EMPTY[tab] : "No leads match these filters.";

  return (
    <>
      <StatRow stats={stats} className="mb-6" />

      <div className="mb-4">
        <SurveyFilterCards cards={surveyCards} selectedId={surveyFilter} onSelect={setSurveyFilter} />
      </div>

      {/* One toolbar row: which leads (tabs) on the left, search, source and
          the two narrowing toggles on the right. Wraps below the container
          width rather than reserving a second row of chrome. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FilterTabs
          label="Filter leads by stage"
          tabs={QUEUE_TABS.map((value) => ({ value, label: TAB_LABELS[value], count: tabCounts[value] }))}
          value={tab}
          onChange={selectTab}
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Name, email, company"
            label="Search leads by name, email, or company"
            className="w-64 max-w-none flex-none"
          />

          <select
            value={showTest ? TEST_SOURCE_VALUE : sourceFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === TEST_SOURCE_VALUE) {
                setShowTest(true);
                setSourceFilter("all");
                return;
              }
              setShowTest(false);
              setSourceFilter(value);
            }}
            aria-label="Choose which responses the queue reads from"
            className={SELECT_CLASSES}
          >
            <option value="all">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
            <option value={TEST_SOURCE_VALUE}>Include test responses</option>
          </select>

          <Button
            type="button"
            size="sm"
            variant={hotOnly ? "primary" : "secondary"}
            onClick={() => setHotOnly((p) => !p)}
            aria-pressed={hotOnly}
          >
            Score {WORTH_A_CALL_SCORE_MIN}+
          </Button>
          {/* Only offered when at least one row in view has a fit score. A
              filter for a value nothing has is a dead control. */}
          {showFitColumn && (
            <Button
              type="button"
              size="sm"
              variant={fitHotOnly ? "primary" : "secondary"}
              onClick={() => setFitHotOnly((p) => !p)}
              aria-pressed={fitHotOnly}
            >
              Fit {HOT_FIT_MIN}+
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="type-body-sm mb-3 text-destructive">
          {actionError}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(lead) => lead.id}
        rowHref={(lead) => `/admin/responses/${lead.id}`}
        layout="fixed"
        sort={sort}
        onSort={onSort}
        empty={{ title: emptyTitle }}
      />
    </>
  );
}
