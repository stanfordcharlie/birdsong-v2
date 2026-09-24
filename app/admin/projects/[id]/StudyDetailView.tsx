"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CollapsibleSection,
  DataTable,
  PageHeader,
  PageShell,
  RelativeTime,
  StatRow,
  type Column,
} from "@/components/admin/ui";
import { EMPTY_VALUE, formatMinutes, formatPercent } from "@/lib/format";
import { coverageAdvisory, interviewLengthPreset, interviewLengthSummary } from "@/lib/studies/interview-length";
import { StudyForm, type StudyFormValues } from "@/components/StudyForm";
import { ReportSection, type SurveyReportRow } from "./ReportSection";
import { ResponsesTable, type ResponseTableRow } from "./ResponsesTable";
import { ProspectsPreview, type ProspectsPreviewData } from "./ProspectsPreview";

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
  questionGuide: string;
  respondentChips: RespondentChip[];
  publishPublic: boolean;
};

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
        <span className="font-medium">{row.source}</span>
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
  return <h2 className="type-eyebrow mb-2">{title}</h2>;
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
        <span className="w-8 shrink-0 font-archivo text-count tabular-nums text-muted-foreground">
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
  prospects,
  inProgressCount,
  worthACallCount,
  completionRate,
  lastResponseAt,
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
  prospects: ProspectsPreviewData;
  inProgressCount: number;
  worthACallCount: number;
  completionRate: number | null;
  lastResponseAt: string | null;
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
  const editAction = permissions.edit ? <EditAction onClick={() => setEditing(true)} /> : undefined;
  const [shareCopied, setShareCopied] = useState(false);
  const [surveyUrl, setSurveyUrl] = useState(`/study/${survey.slug}`);
  const questions = parseQuestionGuide(survey.questionGuide);
  const statusLabel = survey.archived ? "Archived" : survey.status === "live" ? "Live" : "Draft";

  // Starts as a relative path so the server- and client-rendered markup
  // match, then upgrades to the full URL once we know the origin.
  useEffect(() => {
    setSurveyUrl(`${window.location.origin}/study/${survey.slug}`);
  }, [survey.slug]);

  async function handleShare() {
    await navigator.clipboard.writeText(surveyUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  if (editing) {
    return (
      <PageShell>
        <Card padding="flush">
          <div className="flex items-center justify-between border-b border-border p-6 pb-4">
            <h2 className="type-section-label">Edit study</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
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

  // The one line under the H1: the public name, when it differs from the
  // internal one. The seeded study sets external_title to its title verbatim,
  // so anything that only repeats the H1 is dropped rather than printed twice.
  const meta = [survey.externalTitle]
    .map((value) => value.trim())
    .find((value) => value && !saysTheSameThing(value, survey.title));

  const audienceText = [
    survey.topic.trim(),
    survey.targetAudience.trim() ? `Targeting ${survey.targetAudience.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lengthPreset = interviewLengthPreset(survey.interviewLength);
  const coverage = coverageAdvisory(lengthPreset, questions.length);
  const optionalFieldCount = survey.respondentChips.length;

  return (
    <PageShell>
      <PageHeader
        className="bs-rise-1"
        eyebrow={
          <Link
            href="/admin/projects"
            className="focus-ring rounded-control transition-colors hover:text-card-foreground"
          >
            Projects
          </Link>
        }
        title={survey.title}
        // Status once: a neutral badge beside the title, not also a dot in
        // the eyebrow and a tinted fill.
        badge={<Badge variant="count">{statusLabel}</Badge>}
        meta={meta}
        actions={
          <>
            <Button type="button" onClick={handleShare}>
              <span aria-live="polite">{shareCopied ? "Copied" : "Copy link"}</span>
            </Button>
            {/* ?test=1: owner-verified server-side; lets the admin run the
                interview (even on a draft) without creating a real lead,
                firing the email, or skewing stats. The copied link stays the
                clean respondent URL. */}
            <Button type="button" variant="secondary" asChild>
              <a href={`/study/${survey.slug}?test=1`} target="_blank" rel="noreferrer">
                Preview interview
              </a>
            </Button>
            {/* The prospect roster is a sibling route, not a tab: this page
                is one column of sections with no tab strip to join. */}
            <Button type="button" variant="secondary" asChild>
              <Link href={`/admin/projects/${survey.id}/prospects`}>Prospects</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-8">
        <StatRow
          className="bs-rise-2"
          stats={[
            {
              label: "Responses",
              value: responseCount,
              delta: inProgressCount > 0 ? `${inProgressCount} in progress` : undefined,
            },
            { label: "Worth a call", value: worthACallCount },
            {
              label: "Completion rate",
              value: formatPercent(completionRate === null ? null : completionRate / 100),
            },
            {
              label: "Last response",
              value: lastResponseAt ? <RelativeTime date={lastResponseAt} /> : EMPTY_VALUE,
            },
            // Real completion time against the preset's promise. EMPTY_VALUE
            // until three completed, non-seed interviews carry completed_at.
            { label: "Median time", value: medianCompletionMs === null ? EMPTY_VALUE : formatMinutes(medianCompletionMs) },
          ]}
        />

        <ResponsesTable responses={responses} />

        <ProspectsPreview surveyId={survey.id} data={prospects} />

        <section>
          <SectionHeader title="Setup" />
          <Card padding="flush">
            <div className="px-6">
              <CollapsibleSection
                title="Audience and goal"
                summary={audienceText || "Not set"}
                action={editAction}
              >
                <p className="admin-measure type-body">{audienceText || "Not set."}</p>
              </CollapsibleSection>

              <CollapsibleSection
                title="Questions"
                // The preset paces the interview; the guide's topics are
                // covered in order until the preset's count is reached.
                summary={`${interviewLengthSummary(lengthPreset)} · ${questions.length} ${questions.length === 1 ? "topic" : "topics"}${coverage ? ` · covers the first ${lengthPreset.topics}` : ""}`}
                action={editAction}
              >
                {questions.length === 0 ? (
                  <p className="type-body text-muted-foreground">No questions yet.</p>
                ) : (
                  <div className="flex flex-col">
                    {questions.map((question, i) => (
                      <SetupRow
                        key={i}
                        marker={String(i + 1).padStart(2, "0")}
                        label={question}
                      />
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
                  {[
                    { label: "Name", required: true },
                    { label: "Email", required: true },
                    ...survey.respondentChips,
                  ].map((field) => (
                    <SetupRow
                      key={field.label}
                      label={field.label}
                      trailing={
                        <Badge variant={field.required ? "outline" : "count"} size="sm">
                          {field.required ? "Required" : "Optional"}
                        </Badge>
                      }
                    />
                  ))}
                </div>
              </CollapsibleSection>
            </div>
          </Card>
        </section>

        {sourceBreakdown && (
          <section>
            <SectionHeader title="Sources" />
            {/* Above the table so the two rows Birdsong names are explained
                before they are read, and the one thing the admin can do
                about it (tag a link) is stated in the same breath. */}
            <p className="type-body-sm mb-3 text-muted-foreground">
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
              density="compact"
              empty={{ title: "No tagged traffic yet." }}
            />
          </section>
        )}

        <ReportSection
          surveyId={survey.id}
          surveySlug={survey.slug}
          initialReport={latestReport}
          initialPublishPublic={survey.publishPublic}
          completedInterviewCount={completedInterviewCount}
          canGenerate={permissions.generateReport}
          canPublish={permissions.publishReport}
        />
      </div>
    </PageShell>
  );
}
