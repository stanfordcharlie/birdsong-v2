"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CollapsibleSection,
  DataTable,
  PageShell,
  PageTopBar,
  SearchInput,
  SectionTabs,
  StatRow,
  type Column,
  type SectionTab,
  type Stat,
} from "@/components/admin/ui";
import { bg, border, dot, radius, shadow, text } from "@/components/admin/ui/tokens";
import { ToggleChip } from "@/app/admin/leads/controls";
import { EMPTY_VALUE, formatDayMonth, formatMinutes, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { coverageAdvisory, interviewLengthPreset, interviewLengthSummary } from "@/lib/studies/interview-length";
import { StudyForm, type StudyFormValues } from "@/components/StudyForm";
import { ReportSection, type SurveyReportRow } from "./ReportSection";
import { ResponsesTable, type ResponseTableRow } from "./ResponsesTable";

export type SourceBreakdownRow = {
  source: string;
  // "system" is a row Birdsong assigns (Direct, Outbound); "tag" is a ?src=
  // value the admin put on a link, shown verbatim.
  kind: "system" | "tag";
  starts: number;
  completions: number;
};

export type RespondentChip = {
  label: string;
  required: boolean;
};

export type StudyDetailData = {
  id: string;
  status: string;
  archived: boolean;
  title: string;
  externalTitle: string;
  slug: string;
  topic: string;
  targetAudience: string;
  interviewLength: string;
  createdAt: string;
  questionGuide: string;
  respondentChips: RespondentChip[];
  publishPublic: boolean;
};

/** One measure on the Interview quality card: a share of interviews, 0 to 1. */
export type QualityMetric = { label: string; ratio: number };

// The sections that swap in place. Prospects is a tab too, but it is its own
// route, so it is never the value here.
const STUDY_TABS = ["responses", "report", "brief"] as const;
export type StudyTab = (typeof STUDY_TABS)[number];

export function isStudyTab(value: unknown): value is StudyTab {
  return typeof value === "string" && (STUDY_TABS as readonly string[]).includes(value);
}

// Below this a quality measure is drawn in the warn colour.
const QUALITY_WARN_BELOW = 0.6;

// The AI-generated question_guide is one free-text brief, not a structured
// list — but its own generation prompt (lib/studies/question-guide.ts)
// consistently produces numbered, blank-line-separated points, so this is a
// faithful re-parse of real content rather than a guess. Older/hand-edited
// guides that don't follow the pattern still degrade gracefully: each
// blank-line-separated chunk just becomes its own numbered item.
function parseQuestionGuide(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim().replace(/^\d+\.\s*/, ""))
    .filter(Boolean);
}

/** Same sentence, different column. Trimmed and case-folded before comparing. */
function saysTheSameThing(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// A tag the admin typed renders as a chip, so it reads as a literal value
// they set; the rows Birdsong assigns (Direct, Outbound) are plain text.
const SOURCE_COLUMNS: Column<SourceBreakdownRow>[] = [
  {
    key: "source",
    header: "Source",
    cell: (row) =>
      row.kind === "tag" ? (
        <Badge variant="count" size="sm">
          {row.source}
        </Badge>
      ) : (
        <span className="font-semibold">{row.source}</span>
      ),
  },
  { key: "starts", header: "Starts", align: "right", width: "sm", cell: (row) => row.starts },
  { key: "completions", header: "Completions", align: "right", width: "md", cell: (row) => row.completions },
  {
    key: "rate",
    header: "Completion rate",
    align: "right",
    width: "md",
    // A row exists only once something started, so zero starts is the
    // empty glyph rather than a division by zero dressed up as 0%.
    cell: (row) => formatPercent(row.starts > 0 ? row.completions / row.starts : null),
  },
];

function SectionHeader({ title }: { title: string }) {
  return <h2 className={cn("ds-eyebrow mb-2", text.muted3)}>{title}</h2>;
}

function QualityCard({ metrics }: { metrics: QualityMetric[] }) {
  return (
    <Card className="flex flex-col gap-4 px-5 py-[18px]" padding="flush">
      <h2 className="ds-control">Interview quality</h2>
      <div className="flex flex-col gap-3">
        {metrics.map((metric) => {
          const warn = metric.ratio < QUALITY_WARN_BELOW;
          return (
            <div key={metric.label} className="flex flex-col gap-[5px]">
              <div className="flex justify-between gap-3 text-[12px]">
                <span className={text.muted2}>{metric.label}</span>
                <span className={cn("font-mono tabular-nums", warn && text.warn)}>
                  {formatPercent(metric.ratio)}
                </span>
              </div>
              <div className={cn("h-[6px] overflow-hidden rounded-full", bg.track)}>
                <div
                  className={cn("h-full rounded-full", warn ? dot.warn : dot.accent)}
                  style={{ width: `${Math.round(metric.ratio * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// The "···" button: the actions that did not earn a button of their own.
function MoreMenu({ items }: { items: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="secondary"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-[34px] px-0"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="8" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="13" cy="8" r="1.3" />
        </svg>
      </Button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 flex min-w-[160px] flex-col border p-1",
            radius.control,
            border.base,
            bg.base,
            shadow.input
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "focus-ring flex h-[34px] items-center px-[10px] text-left text-[13px] font-semibold hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
                radius.chip,
                text.ink3
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The quiet "Edit" in a setup section's header. Ghost is the system's bare
 * text action — no border, no fill, so it does not read as a second primary
 * button sitting inside a disclosure row.
 */
function EditAction({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="px-0" onClick={onClick}>
      Edit
    </Button>
  );
}

/**
 * One h-9 row in a setup section's body. The question list used to spend
 * most of its height on padding and a full-width rule; this drops the
 * rules, because a numbered list is already a list.
 */
function SetupRow({
  marker,
  trailing,
  label,
}: {
  /** The fixed left column: a number, or nothing. */
  marker?: React.ReactNode;
  trailing?: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex h-9 items-center gap-4">
      {marker !== undefined && (
        <span className={cn("ds-mono-count w-8 shrink-0 tabular-nums", text.muted2)}>
          {marker}
        </span>
      )}
      {/* Truncated rather than wrapped: the row rhythm is the point, and the
          full text is one hover (or one click through to Edit) away. */}
      <span className="type-body min-w-0 flex-1 truncate" title={label}>
        {label}
      </span>
      {trailing}
    </div>
  );
}

export function StudyDetailView({
  survey,
  responses,
  responseCount,
  medianCompletionMs,
  prospectCount,
  inProgressCount,
  worthACallCount,
  completionRate,
  quality,
  initialTab,
  initialValues,
  latestReport,
  completedInterviewCount,
  sourceBreakdown,
  permissions,
}: {
  survey: StudyDetailData;
  responses: ResponseTableRow[];
  /** Completed responses. In-progress interviews are counted separately. */
  responseCount: number;
  /** Median interview duration from completed_at, null until three rows have one. */
  medianCompletionMs: number | null;
  /** Prospects on the roster. Zero drops the stat. */
  prospectCount: number;
  inProgressCount: number;
  worthACallCount: number;
  completionRate: number | null;
  /** The Interview quality card's measures. Empty omits the card. */
  quality: QualityMetric[];
  /** From ?tab=, so a link can open the report. */
  initialTab: StudyTab;
  initialValues: StudyFormValues;
  latestReport: SurveyReportRow | null;
  completedInterviewCount: number;
  // Null when there's nothing to compare yet (every response so far is
  // "Direct", or they're all from the same tagged source).
  sourceBreakdown: SourceBreakdownRow[] | null;
  // From can() on the server. False hides the affordance; the routes and RLS
  // behind each one refuse regardless.
  permissions: { edit: boolean; generateReport: boolean; publishReport: boolean };
}) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<StudyTab>(initialTab);
  const [query, setQuery] = useState("");
  const [worthOnly, setWorthOnly] = useState(false);
  const editAction = permissions.edit ? <EditAction onClick={() => setEditing(true)} /> : undefined;
  const [shareCopied, setShareCopied] = useState(false);
  const [studyUrl, setStudyUrl] = useState(`/study/${survey.slug}`);
  const questions = parseQuestionGuide(survey.questionGuide);

  // Starts as a relative path so the server- and client-rendered markup
  // match, then upgrades to the full URL once we know the origin.
  useEffect(() => {
    setStudyUrl(`${window.location.origin}/study/${survey.slug}`);
  }, [survey.slug]);

  async function handleShare() {
    await navigator.clipboard.writeText(studyUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  const crumbs = [{ label: "Projects", href: "/admin/projects" }, { label: survey.title }];

  if (editing) {
    return (
      <PageShell>
        <PageTopBar
          crumbs={crumbs}
          actions={
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          }
        />
        <Card padding="flush" header="Edit study">
          <div className="p-6">
            <StudyForm
              mode="edit"
              surveyId={survey.id}
              initialValues={initialValues}
              onSaved={() => setEditing(false)}
            />
          </div>
        </Card>
      </PageShell>
    );
  }

  const audienceText = [
    survey.topic.trim(),
    survey.targetAudience.trim() ? `Targeting ${survey.targetAudience.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lengthPreset = interviewLengthPreset(survey.interviewLength);
  const coverage = coverageAdvisory(lengthPreset, questions.length);
  const optionalFieldCount = survey.respondentChips.length;

  // The public name, when it differs from the internal one. The seeded study
  // sets external_title to its title verbatim, so anything that only repeats
  // the H1 is dropped rather than printed twice.
  const externalTitle = survey.externalTitle.trim();
  const publicName = externalTitle && !saysTheSameThing(externalTitle, survey.title) ? externalTitle : null;

  const stats: Stat[] = [
    ...(prospectCount > 0
      ? [{ label: "Prospects", value: prospectCount, href: `/admin/projects/${survey.id}/prospects` }]
      : []),
    {
      label: "Responses",
      value: responseCount,
      delta: inProgressCount > 0 ? `${inProgressCount} in progress` : undefined,
    },
    { label: "Worth a call", value: worthACallCount, emphasis: true },
    { label: "Completion", value: formatPercent(completionRate === null ? null : completionRate / 100) },
    // Real completion time against the preset's promise. EMPTY_VALUE until
    // three completed, non-seed interviews carry completed_at.
    { label: "Median time", value: medianCompletionMs === null ? EMPTY_VALUE : formatMinutes(medianCompletionMs) },
  ];

  const tabs: SectionTab<StudyTab | "prospects">[] = [
    { value: "responses", label: "Responses", count: responses.length },
    {
      value: "prospects",
      label: "Prospects",
      count: prospectCount,
      href: `/admin/projects/${survey.id}/prospects`,
    },
    { value: "report", label: "Report" },
    { value: "brief", label: "Brief" },
  ];

  const moreItems = permissions.edit ? [{ label: "Edit study", onSelect: () => setEditing(true) }] : [];

  return (
    <PageShell className="gap-6">
      <PageTopBar
        crumbs={crumbs}
        actions={
          <>
            {/* ?test=1: owner-verified server-side; lets the admin run the
                interview (even on a draft) without creating a real lead,
                firing the email, or skewing stats. The copied link stays the
                clean respondent URL. */}
            <Button type="button" variant="secondary" asChild>
              <a href={`/study/${survey.slug}?test=1`} target="_blank" rel="noreferrer">
                Preview
              </a>
            </Button>
            {latestReport && (
              <Button type="button" variant="secondary" onClick={() => setTab("report")}>
                Report
              </Button>
            )}
            <Button type="button" onClick={handleShare}>
              <span aria-live="polite">{shareCopied ? "Copied" : "Copy link"}</span>
            </Button>
            {moreItems.length > 0 && <MoreMenu items={moreItems} />}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className={cn("ds-h1 text-[28px]", text.ink)}>{survey.title}</h1>
        {survey.archived ? (
          <Badge variant="outline">Archived</Badge>
        ) : (
          <Badge state={survey.status === "live" ? "live" : "draft"} />
        )}
        <span className={cn("text-[13px]", text.muted2)}>
          {interviewLengthSummary(lengthPreset)} · since {formatDayMonth(survey.createdAt)}
          {publicName && ` · shown as ${publicName}`}
        </span>
      </div>

      <StatRow stats={stats} />

      <SectionTabs
        label="Study sections"
        tabs={tabs}
        value={tab}
        onChange={(value) => {
          if (value !== "prospects") setTab(value);
        }}
        trailing={
          tab === "responses" ? (
            <>
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search"
                label="Search responses"
                className="h-[32px] w-[200px] flex-none basis-auto"
              />
              <ToggleChip active={worthOnly} onToggle={() => setWorthOnly((value) => !value)}>
                Worth a call only
              </ToggleChip>
            </>
          ) : undefined
        }
      />

      {tab === "responses" && (
        <>
          <div
            className={cn(
              "grid grid-cols-1 items-start gap-6",
              quality.length > 0 && "xl:grid-cols-[minmax(0,1fr)_300px]"
            )}
          >
            <ResponsesTable responses={responses} query={query} worthOnly={worthOnly} />
            {quality.length > 0 && <QualityCard metrics={quality} />}
          </div>

          {sourceBreakdown && (
            <section>
              <SectionHeader title="Sources" />
              {/* Above the table so the two rows Birdsong names are explained
                  before they are read, and the one thing the admin can do
                  about it (tag a link) is stated in the same breath. */}
              <p className={cn("ds-small admin-measure mb-3", text.muted2)}>
                Where respondents came from, with how many started and how many finished. Direct is
                anyone who opened the plain study link. Outbound is anyone who arrived through a
                personal prospect link. To tag a link you share yourself, add{" "}
                <code className="type-code">?src=name</code> to the end of it and that name gets its
                own row here.
              </p>
              <DataTable
                columns={SOURCE_COLUMNS}
                rows={sourceBreakdown}
                rowKey={(row) => row.source}
                empty={{ title: "No tagged traffic yet." }}
              />
            </section>
          )}
        </>
      )}

      {tab === "report" && (
        <ReportSection
          surveyId={survey.id}
          surveySlug={survey.slug}
          initialReport={latestReport}
          initialPublishPublic={survey.publishPublic}
          completedInterviewCount={completedInterviewCount}
          canGenerate={permissions.generateReport}
          canPublish={permissions.publishReport}
        />
      )}

      {tab === "brief" && (
        <Card padding="flush">
          <div className="px-6">
            <CollapsibleSection
              title="Audience and goal"
              summary={audienceText || "Not set"}
              action={editAction}
            >
              <p className="admin-measure ds-body">{audienceText || "Not set."}</p>
            </CollapsibleSection>

            <CollapsibleSection
              title="Questions"
              // The preset paces the interview; the guide's topics are
              // covered in order until the preset's count is reached.
              summary={`${interviewLengthSummary(lengthPreset)} · ${questions.length} ${questions.length === 1 ? "topic" : "topics"}${coverage ? ` · covers the first ${lengthPreset.topics}` : ""}`}
              action={editAction}
            >
              {questions.length === 0 ? (
                <p className={cn("ds-body", text.muted2)}>No questions yet.</p>
              ) : (
                <div className="flex flex-col">
                  {questions.map((question, i) => (
                    <SetupRow key={i} marker={String(i + 1).padStart(2, "0")} label={question} />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Respondent info"
              summary={
                optionalFieldCount === 0
                  ? "Name and email only"
                  : `Name and email, plus ${optionalFieldCount} optional ${
                      optionalFieldCount === 1 ? "field" : "fields"
                    }`
              }
              action={editAction}
            >
              <div className="flex flex-col">
                {[{ label: "Name", required: true }, { label: "Email", required: true }, ...survey.respondentChips].map(
                  (field) => (
                    <SetupRow
                      key={field.label}
                      label={field.label}
                      trailing={
                        <Badge variant={field.required ? "outline" : "count"} size="sm">
                          {field.required ? "Required" : "Optional"}
                        </Badge>
                      }
                    />
                  )
                )}
              </div>
            </CollapsibleSection>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
