"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FilterTabs,
  FloatingBar,
  FloatingBarButton,
  LEAD_STATUS_BADGE_STATE,
  PageTopBar,
  RelativeTime,
  ScoreChip,
  SearchInput,
  StackedCell,
  StatRow,
  useTableSort,
  type Column,
  type Stat,
} from "@/components/admin/ui";
import { dot, text } from "@/components/admin/ui/tokens";
import { EMPTY_VALUE } from "@/lib/format";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { isClosedStatus, type LeadStatus } from "@/lib/leads/state";
import {
  assignLead,
  claimLead,
  setLeadStatus,
  unassignLead,
  type LeadActionResult,
} from "@/lib/leads/actions";
import { cn } from "@/lib/utils";
import { SelectControl, ToggleChip } from "./controls";
import { isQueueTab, QUEUE_TABS, type QueueTab } from "./queue-tabs";

export type LeadItem = {
  id: string;
  name: string | null;
  email: string | null;
  /** Job title, from the respondent's custom fields. */
  title: string | null;
  company: string | null;
  surveyId: string;
  surveyTitle: string;
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
  /** When the response last pushed to HubSpot. Null until a push succeeds. */
  hubspotSyncedAt: string | null;
};

export type QueueMember = { id: string; name: string };

export type QueuePermissions = {
  claim: boolean;
  assignOthers: boolean;
  setStatus: boolean;
  pushToCrm: boolean;
};

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

// The mockup's grid: checkbox, Respondent, Company, Score, Fit, Status,
// Assignee, HubSpot, Last activity.
const GRID_TEMPLATE = "24px minmax(0,1.6fr) minmax(0,1.3fr) 56px 56px 120px 150px 104px 110px";

const ALL_STUDIES_VALUE = "__all__";

// The sources select doubles as the data-source switch. "Include test
// responses" used to be a third chip sitting beside the two lead filters,
// which made a question about which rows exist look like a question about
// which leads are hot.
const TEST_SOURCE_VALUE = "__include_test__";

// Fit uses the same threshold as the lead score, so the "Fit 7+" filter
// mirrors "Score 7+".
const HOT_FIT_MIN = 7;

const CHECKBOX = "h-[15px] w-[15px] cursor-pointer accent-[hsl(var(--ds-accent))]";

type BulkKind = "assign" | "contacted" | "push";

type BulkReport = {
  kind: BulkKind;
  total: number;
  failures: { id: string; name: string; error: string }[];
};

const BULK_DONE: Record<BulkKind, (ok: number, total: number) => string> = {
  assign: (ok, total) => `Assigned ${ok} of ${total} to you`,
  contacted: (ok, total) => `Marked ${ok} of ${total} contacted`,
  push: (ok, total) => `Pushed ${ok} of ${total} to HubSpot`,
};

const BULK_RUNNING: Record<BulkKind, string> = {
  assign: "Assigning",
  contacted: "Marking",
  push: "Pushing",
};

function leadName(lead: LeadItem): string {
  return lead.name || lead.email || "Unnamed respondent";
}

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
  const searchParams = useSearchParams();
  // Local copy so a claim or assignment is reflected in the row the moment
  // the action returns, ahead of the server re-render router.refresh asks for.
  const [leads, setLeads] = useState(items);
  useEffect(() => setLeads(items), [items]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<QueueTab>(initialTab);
  // null = all studies.
  const [surveyFilter, setSurveyFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [fitHotOnly, setFitHotOnly] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkRunning, setBulkRunning] = useState<{ kind: BulkKind; done: number; total: number } | null>(
    null
  );
  const [bulkReport, setBulkReport] = useState<BulkReport | null>(null);

  // A ?tab= link followed while the queue is already on screen (the top
  // bar's Triage button, the sidebar) re-renders the page without remounting
  // this component, so the tab follows the parameter when it changes.
  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (isQueueTab(tabParam)) setTab(tabParam);
  }, [tabParam]);

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

  // Everything the stats and the tabs count is measured against this set:
  // every lead the user can currently see, before any of the narrowing
  // filters. Only the test toggle applies, because a hidden test row
  // shouldn't be counted in a number sitting next to visible rows.
  const visibleLeads = useMemo(
    () => (showTest ? leads : leads.filter((lead) => !lead.isTest)),
    [leads, showTest]
  );

  // Only studies that actually have completed responses can produce rows, so
  // the options are derived from the rows themselves rather than from the
  // study list. Most leads first.
  const studyOptions = useMemo(() => {
    const byStudy = new Map<string, { id: string; title: string; leadCount: number }>();
    for (const lead of visibleLeads) {
      const option = byStudy.get(lead.surveyId);
      if (option) option.leadCount += 1;
      else byStudy.set(lead.surveyId, { id: lead.surveyId, title: lead.surveyTitle, leadCount: 1 });
    }
    return Array.from(byStudy.values()).sort((a, b) => b.leadCount - a.leadCount);
  }, [visibleLeads]);

  // A selected study that has since disappeared from the options (archived,
  // or its last lead switched to test) would leave the queue scoped to
  // nothing. Fall back to all studies instead of an empty state.
  useEffect(() => {
    if (surveyFilter !== null && !studyOptions.some((option) => option.id === surveyFilter)) {
      setSurveyFilter(null);
    }
  }, [studyOptions, surveyFilter]);

  // The study is the outermost filter: the stats and every tab count restate
  // whatever it has selected.
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

  const stats = useMemo<Stat[]>(() => {
    const byStatus = (status: LeadStatus) =>
      scopedLeads.filter((lead) => lead.leadStatus === status).length;
    return [
      { label: "Unworked", value: byStatus("new"), emphasis: true },
      { label: "Assigned to me", value: tabCounts.mine },
      { label: "Contacted", value: byStatus("contacted") },
      { label: "Meetings booked", value: byStatus("meeting_booked") },
      { label: "Qualified", value: byStatus("qualified") },
    ];
  }, [scopedLeads, tabCounts.mine]);

  // What the top bar's Triage button counts: every unworked lead in view,
  // across studies, because the link it follows clears no filter.
  const unworkedTotal = useMemo(
    () => visibleLeads.filter((lead) => lead.leadStatus === "new").length,
    [visibleLeads]
  );

  // Distinct, non-null source values actually present in this user's data.
  // Most accounts won't have any ?src= traffic yet, so the source options are
  // hidden until at least one exists, but the select itself stays, because
  // it also carries the include-test-responses switch.
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

  function applyResult(leadId: string, result: Extract<LeadActionResult, { ok: true }>) {
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
  }

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
      applyResult(leadId, result);
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

  // The same push the lead page's button makes, one lead at a time. Anything
  // but a 2xx is a failure with the route's own words.
  async function pushToHubSpot(lead: LeadItem): Promise<void> {
    const res = await fetch(`/api/responses/${lead.id}/hubspot-sync`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      reason?: string;
      advancedTo?: string | null;
    } | null;
    if (!res.ok) {
      throw new Error(data?.error || data?.reason || `HubSpot returned ${res.status}`);
    }
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((row) =>
        row.id === lead.id
          ? data?.advancedTo === "contacted"
            ? { ...row, leadStatus: "contacted", lastActivityAt: now, hubspotSyncedAt: now }
            : { ...row, hubspotSyncedAt: now }
          : row
      )
    );
  }

  // Bulk actions run the single-lead action for each selected lead, in
  // sequence, and report every lead that did not go through by name. A lead
  // that failed stays selected, so the retry is one click.
  async function runBulk(kind: BulkKind, targets: LeadItem[]) {
    if (targets.length === 0 || bulkRunning) return;
    setActionError(null);
    setBulkReport(null);
    setBulkRunning({ kind, done: 0, total: targets.length });
    const failures: BulkReport["failures"] = [];
    for (let i = 0; i < targets.length; i += 1) {
      const lead = targets[i];
      try {
        if (kind === "push") {
          await pushToHubSpot(lead);
        } else {
          const result =
            kind === "assign" ? await claimLead(lead.id) : await setLeadStatus(lead.id, "contacted");
          if (!result.ok) throw new Error(result.error);
          applyResult(lead.id, result);
        }
      } catch (err) {
        failures.push({
          id: lead.id,
          name: leadName(lead),
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
      setBulkRunning({ kind, done: i + 1, total: targets.length });
    }
    setBulkRunning(null);
    setBulkReport({ kind, total: targets.length, failures });
    setSelected(new Set(failures.map((failure) => failure.id)));
    router.refresh();
  }

  const canAssign = permissions.claim || permissions.assignOthers;

  const columnsWithoutSelect: Column<LeadItem>[] = [
    {
      key: "name",
      header: "Respondent",
      rowLabel: true,
      title: (lead) => lead.name ?? undefined,
      cell: (lead) => (
        <StackedCell
          primary={
            <>
              <Link
                href={`/admin/responses/${lead.id}`}
                className="focus-ring rounded-[var(--ds-radius-chip)] hover:text-[color:hsl(var(--ds-accent))]"
              >
                {lead.name || EMPTY_VALUE}
              </Link>
              {lead.isTest && (
                <Badge variant="warning" size="sm" className="ml-2 align-middle">
                  Test
                </Badge>
              )}
            </>
          }
          secondary={lead.title ?? lead.email}
        />
      ),
    },
    {
      key: "company",
      header: "Company",
      title: (lead) => lead.company ?? undefined,
      cell: (lead) => (
        <StackedCell
          primary={<span className="text-[14px] font-semibold">{lead.company || EMPTY_VALUE}</span>}
          secondary={lead.surveyTitle}
        />
      ),
    },
    {
      key: "score",
      header: "Score",
      sortable: true,
      sortValue: (lead) => lead.leadScore,
      cell: (lead) => <ScoreChip score={lead.leadScore} />,
    },
    {
      key: "fit",
      header: "Fit",
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
          <ScoreChip score={lead.fitScore} variant="fit" />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (lead) => <Badge state={LEAD_STATUS_BADGE_STATE[lead.leadStatus]} />,
    },
    // Who holds the lead, and the control to change that, in one column.
    // With the assign-others permission the cell is the select (its value is
    // the assignee; "Me" claims); with only the claim permission it is the
    // name, or a Claim button while nobody holds it.
    {
      key: "assignee",
      header: "Assignee",
      title: (lead) => (canAssign ? undefined : (lead.assigneeName ?? undefined)),
      cell: (lead) => {
        const pending = pendingId === lead.id || bulkRunning !== null;
        const name = lead.assignedTo === currentUserId ? "Me" : lead.assigneeName;
        if (permissions.assignOthers) {
          return (
            <SelectControl
              size="row"
              muted={!lead.assignedTo}
              value={lead.assignedTo ?? ""}
              disabled={pending}
              onChange={(event) => handleAssignSelect(lead, event.target.value)}
              aria-label={`Assign ${lead.name || "this lead"} to a teammate`}
              className="w-full"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === currentUserId ? "Me" : member.name}
                </option>
              ))}
              {/* Held by someone who has since left the team: still held,
                  and the select has to be able to say so. */}
              {lead.assignedTo && !members.some((member) => member.id === lead.assignedTo) && (
                <option value={lead.assignedTo}>{lead.assigneeName ?? "Former teammate"}</option>
              )}
            </SelectControl>
          );
        }
        if (lead.assignedTo || !permissions.claim) {
          return (
            <span className={cn("block truncate text-[12px] font-semibold", name ? text.ink : text.muted3)}>
              {name ?? "Unassigned"}
            </span>
          );
        }
        return (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => runAction(lead.id, () => claimLead(lead.id))}
          >
            {pendingId === lead.id ? "Claiming" : "Claim"}
          </Button>
        );
      },
    },
    // The push is manual, so the column says whether it has happened and
    // when, never that the record is in step with the CRM.
    {
      key: "hubspot",
      header: "HubSpot",
      sortable: true,
      sortValue: (lead) => (lead.hubspotSyncedAt ? new Date(lead.hubspotSyncedAt).getTime() : null),
      cell: (lead) =>
        lead.hubspotSyncedAt ? (
          <StackedCell
            primary={<span className="text-[12px] font-semibold">Pushed</span>}
            secondary={<RelativeTime date={lead.hubspotSyncedAt} className="ds-mono-count" />}
          />
        ) : (
          <span className={cn("block truncate text-[12px] font-semibold", text.muted3)}>Not pushed</span>
        ),
    },
    {
      key: "activity",
      header: "Last activity",
      align: "right",
      sortable: true,
      sortValue: (lead) => new Date(lead.lastActivityAt).getTime(),
      cell: (lead) => (
        <RelativeTime
          date={lead.lastActivityAt}
          align="right"
          className={cn("ds-mono-count", text.muted2)}
        />
      ),
    },
  ];

  // The server hands rows back score-desc, then most recently touched, which
  // is the order this queue is meant to be worked in, so the default sort is
  // no sort.
  const { rows, sort, onSort } = useTableSort(filtered, columnsWithoutSelect);

  // Selection is of rows on screen: a lead a filter has hidden is not acted
  // on by a bar that says "2 selected" over a table that shows neither.
  const selectedRows = rows.filter((lead) => selected.has(lead.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((lead) => lead.id)));
  }

  const columns: Column<LeadItem>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={allSelected}
          ref={(element) => {
            if (element) element.indeterminate = selectedRows.length > 0 && !allSelected;
          }}
          onChange={toggleAll}
          disabled={bulkRunning !== null}
          className={cn(CHECKBOX, "block")}
        />
      ),
      cell: (lead) => (
        <input
          type="checkbox"
          aria-label={`Select ${leadName(lead)}`}
          checked={selected.has(lead.id)}
          onChange={() => toggleRow(lead.id)}
          disabled={bulkRunning !== null}
          className={cn(CHECKBOX, "block")}
        />
      ),
    },
    ...columnsWithoutSelect,
  ];

  // The tab's own sentence when the tab is genuinely empty; the filter
  // sentence when it is the search or a toggle that emptied it.
  const emptyTitle = tabCounts[tab] === 0 ? TAB_EMPTY[tab] : "No leads match these filters.";

  const showBar = selectedRows.length > 0 || bulkRunning !== null;
  const bulkOk = bulkReport ? bulkReport.total - bulkReport.failures.length : 0;

  return (
    <>
      <PageTopBar
        crumbs={[{ label: "Leads" }]}
        actions={
          unworkedTotal > 0 ? (
            <Button asChild>
              <Link href="/admin/leads?tab=unworked" onClick={() => selectTab("unworked")}>
                Triage <span className="font-mono font-medium">{unworkedTotal}</span> unworked
              </Link>
            </Button>
          ) : undefined
        }
      />

      <StatRow stats={stats} className="mb-5" />

      {/* One row: which leads (tabs) on the left; search, study, source and
          the two narrowing toggles on the right. Wraps below the container
          width rather than reserving a second row of chrome. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
            className="w-[220px] max-w-none flex-none basis-auto"
          />

          <SelectControl
            value={surveyFilter ?? ALL_STUDIES_VALUE}
            onChange={(event) =>
              setSurveyFilter(event.target.value === ALL_STUDIES_VALUE ? null : event.target.value)
            }
            aria-label="Filter the queue by study"
            className="max-w-[220px]"
          >
            <option value={ALL_STUDIES_VALUE}>All studies</option>
            {studyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </SelectControl>

          <SelectControl
            value={showTest ? TEST_SOURCE_VALUE : sourceFilter}
            onChange={(event) => {
              const value = event.target.value;
              if (value === TEST_SOURCE_VALUE) {
                setShowTest(true);
                setSourceFilter("all");
                return;
              }
              setShowTest(false);
              setSourceFilter(value);
            }}
            aria-label="Choose which responses the queue reads from"
            className="max-w-[220px]"
          >
            <option value="all">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
            <option value={TEST_SOURCE_VALUE}>Include test responses</option>
          </SelectControl>

          <ToggleChip active={hotOnly} onToggle={() => setHotOnly((previous) => !previous)}>
            Score {WORTH_A_CALL_SCORE_MIN}+
          </ToggleChip>
          <ToggleChip active={fitHotOnly} onToggle={() => setFitHotOnly((previous) => !previous)}>
            Fit {HOT_FIT_MIN}+
          </ToggleChip>
        </div>
      </div>

      {actionError && (
        <p role="alert" className={cn("ds-small mb-3 flex items-center gap-2", text.ink)}>
          <span aria-hidden className={cn("h-[6px] w-[6px] shrink-0 rounded-full", dot.danger)} />
          {actionError}
        </p>
      )}

      {bulkReport && (
        <Card
          padding="compact"
          role={bulkReport.failures.length > 0 ? "alert" : "status"}
          className="mb-3 flex items-start justify-between gap-4"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className="ds-body-strong">{BULK_DONE[bulkReport.kind](bulkOk, bulkReport.total)}</p>
            {bulkReport.failures.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {bulkReport.failures.map((failure) => (
                  <li key={failure.id} className={cn("ds-small flex gap-2", text.ink3)}>
                    <span
                      aria-hidden
                      className={cn("mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full", dot.danger)}
                    />
                    <span className="min-w-0 break-words">
                      <span className={cn("font-bold", text.ink)}>{failure.name}</span> failed: {failure.error}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setBulkReport(null)}>
            Dismiss
          </Button>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(lead) => lead.id}
        density="stacked"
        gridTemplate={GRID_TEMPLATE}
        sort={sort}
        onSort={onSort}
        empty={{ title: emptyTitle }}
      />

      {showBar && (
        <>
          {/* Room for the last row to scroll clear of the bar. */}
          <div aria-hidden className="h-[82px]" />
          <FloatingBar
            label={
              bulkRunning ? (
                <>
                  {BULK_RUNNING[bulkRunning.kind]}{" "}
                  <span className="font-mono font-medium">
                    {Math.min(bulkRunning.done + 1, bulkRunning.total)}
                  </span>{" "}
                  of <span className="font-mono font-medium">{bulkRunning.total}</span>
                </>
              ) : (
                <>
                  <span className="font-mono font-medium">{selectedRows.length}</span> selected
                </>
              )
            }
            className="fixed left-[var(--ds-shell-sidebar)] right-0"
          >
            {permissions.claim && (
              <FloatingBarButton
                disabled={bulkRunning !== null}
                onClick={() => runBulk("assign", selectedRows)}
              >
                Assign to me
              </FloatingBarButton>
            )}
            {permissions.setStatus && (
              <FloatingBarButton
                disabled={bulkRunning !== null}
                onClick={() => runBulk("contacted", selectedRows)}
              >
                Mark contacted
              </FloatingBarButton>
            )}
            {permissions.pushToCrm && (
              <FloatingBarButton
                primary
                disabled={bulkRunning !== null}
                onClick={() => runBulk("push", selectedRows)}
              >
                Push to HubSpot
              </FloatingBarButton>
            )}
            <FloatingBarButton
              aria-label="Clear selection"
              disabled={bulkRunning !== null}
              onClick={() => setSelected(new Set())}
              className={cn("w-[38px] px-0 text-[16px]", text.onInkMuted)}
            >
              ×
            </FloatingBarButton>
          </FloatingBar>
        </>
      )}
    </>
  );
}
