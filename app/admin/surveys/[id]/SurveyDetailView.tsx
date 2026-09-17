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
import { EMPTY_VALUE, formatPercent } from "@/lib/format";
import { SurveyForm, type SurveyFormValues } from "@/components/SurveyForm";
import { ReportSection, type SurveyReportRow } from "./ReportSection";
import { ResponsesTable, type ResponseTableRow } from "./ResponsesTable";

export type SourceBreakdownRow = {
  source: string;
  starts: number;
  completions: number;
};

export type RespondentChip = {
  label: string;
  required: boolean;
};

export type SurveyDetailData = {
  id: string;
  status: string;
  archived: boolean;
  title: string;
  externalTitle: string;
  slug: string;
  topic: string;
  targetAudience: string;
  tone: string;
  numQuestions: string;
  questionGuide: string;
  respondentChips: RespondentChip[];
  publishPublic: boolean;
};

// The AI-generated question_guide is one free-text brief, not a structured
// list — but its own generation prompt (lib/surveys/question-guide.ts)
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

const SOURCE_COLUMNS: Column<SourceBreakdownRow>[] = [
  { key: "source", header: "Source", cell: (row) => <span className="font-medium">{row.source}</span> },
  { key: "starts", header: "Starts", align: "right", width: "sm", cell: (row) => row.starts },
  { key: "completions", header: "Completions", align: "right", width: "md", cell: (row) => row.completions },
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

export function SurveyDetailView({
  survey,
  responses,
  responseCount,
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
  survey: SurveyDetailData;
  responses: ResponseTableRow[];
  /** Completed responses. In-progress interviews are counted separately. */
  responseCount: number;
  inProgressCount: number;
  worthACallCount: number;
  completionRate: number | null;
  lastResponseAt: string | null;
  initialValues: SurveyFormValues;
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
  const [surveyUrl, setSurveyUrl] = useState(`/survey/${survey.slug}`);
  const questions = parseQuestionGuide(survey.questionGuide);
  const statusLabel = survey.archived ? "Archived" : survey.status === "live" ? "Live" : "Draft";

  // Starts as a relative path so the server- and client-rendered markup
  // match, then upgrades to the full URL once we know the origin.
  useEffect(() => {
    setSurveyUrl(`${window.location.origin}/survey/${survey.slug}`);
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
            <SurveyForm
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

  const questionCount = questions.length || Number(survey.numQuestions) || 0;
  const optionalFieldCount = survey.respondentChips.length;

  return (
    <PageShell>
      <PageHeader
        className="bs-rise-1"
        eyebrow={
          <Link
            href="/admin/surveys"
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
              <a href={`/survey/${survey.slug}?test=1`} target="_blank" rel="noreferrer">
                Preview interview
              </a>
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
          ]}
        />

        <ResponsesTable responses={responses} />

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
                // The count is a hard total, follow-ups included; the
                // interviewer decides where to spend them.
                summary={`${questionCount} ${questionCount === 1 ? "question" : "questions"}, follow-ups included`}
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
            <DataTable
              columns={SOURCE_COLUMNS}
              rows={sourceBreakdown}
              rowKey={(row) => row.source}
              density="compact"
              empty={{ title: "No tagged traffic yet." }}
            />
            {/* States the one rule the table cannot show: what Direct means. */}
            <p className="type-body-sm mt-2 text-faint">
              By <code className="type-code text-faint">?src=</code> on the shared link. Untagged
              traffic is Direct.
            </p>
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
