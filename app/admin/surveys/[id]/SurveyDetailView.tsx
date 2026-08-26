"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  PageHeader,
  PageShell,
  StatRow,
  type Column,
} from "@/components/admin/ui";
import { formatPercent } from "@/lib/format";
import { SurveyForm, type SurveyFormValues } from "@/components/SurveyForm";
import { ReportSection, type SurveyReportRow } from "./ReportSection";
import { cn } from "@/lib/utils";

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
  title: string;
  externalTitle: string;
  slug: string;
  topic: string;
  targetAudience: string;
  tone: string;
  numQuestions: string;
  questionGuide: string;
  respondentChips: RespondentChip[];
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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const SOURCE_COLUMNS: Column<SourceBreakdownRow>[] = [
  { key: "source", header: "Source", cell: (row) => <span className="font-medium">{row.source}</span> },
  { key: "starts", header: "Starts", align: "right", width: "110px", cell: (row) => row.starts },
  { key: "completions", header: "Completions", align: "right", width: "130px", cell: (row) => row.completions },
];

function SectionHeader({
  title,
  onEdit,
}: {
  title: string;
  onEdit?: () => void;
}) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-6">
      <h2 className="type-section-label">{title}</h2>
      {onEdit && (
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}

export function SurveyDetailView({
  survey,
  responseCount,
  qualifiedCount,
  completionRate,
  initialValues,
  latestReport,
  completedInterviewCount,
  sourceBreakdown,
}: {
  survey: SurveyDetailData;
  responseCount: number;
  qualifiedCount: number;
  completionRate: number | null;
  initialValues: SurveyFormValues;
  latestReport: SurveyReportRow | null;
  completedInterviewCount: number;
  // Null when there's nothing to compare yet (every response so far is
  // "Direct", or they're all from the same tagged source).
  sourceBreakdown: SourceBreakdownRow[] | null;
}) {
  const [editing, setEditing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [surveyUrl, setSurveyUrl] = useState(`/survey/${survey.slug}`);
  const questions = parseQuestionGuide(survey.questionGuide);
  const isLive = survey.status === "live";

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

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(surveyUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  if (editing) {
    return (
      <PageShell>
        <Card padding="flush">
          <div className="flex items-center justify-between border-b border-border p-6 pb-4">
            <h2 className="type-section-label">Edit survey</h2>
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

  return (
    <PageShell>
      <PageHeader
        className="bs-rise-1"
        eyebrow="Surveys"
        title={survey.title}
        badge={<Badge variant={isLive ? "live" : "draft"}>{isLive ? "Live" : "Draft"}</Badge>}
        subtitle={
          <>
            {survey.externalTitle && <span className="block">{survey.externalTitle}</span>}
            <span className="mt-2 flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate">{surveyUrl}</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                aria-label="Copy survey URL"
                className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
              >
                {urlCopied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </span>
          </>
        }
        actions={
          <>
            {/* ?test=1: owner-verified server-side; lets the admin run the
                interview (even on a draft) without creating a real lead,
                firing the email, or skewing stats. The Share link below
                stays the clean respondent URL. */}
            <Button type="button" variant="secondary" asChild>
              <a href={`/survey/${survey.slug}?test=1`} target="_blank" rel="noreferrer">
                Preview interview
              </a>
            </Button>
            <Button type="button" onClick={handleShare}>
              {shareCopied ? "Copied!" : "Share link"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      <div className="bs-rise-2 mb-10">
        <StatRow
          stats={[
            { label: "Responses", value: responseCount },
            { label: "Qualified leads", value: qualifiedCount },
            { label: "Completion rate", value: formatPercent(completionRate === null ? null : completionRate / 100) },
          ]}
        />
        {responseCount === 0 && (
          <p className="type-body-sm mt-4 text-faint">
            Stats fill in as interviews complete. Share your link to get the first ones in.
          </p>
        )}
      </div>

      {sourceBreakdown && (
        <div className="mb-10">
          <SectionHeader title="Sources" />
          <p className="type-body-sm mb-3.5 text-faint">
            Starts and completions by <code className="type-code text-faint">?src=</code> on the shared
            link. Untagged traffic shows as Direct.
          </p>
          <Card padding="flush">
            <DataTable
              columns={SOURCE_COLUMNS}
              rows={sourceBreakdown}
              rowKey={(row) => row.source}
              empty={{ title: "No tagged traffic yet" }}
            />
          </Card>
        </div>
      )}

      <div className="bs-rise-3 mb-10">
        <SectionHeader title="Audience & goal" onEdit={() => setEditing(true)} />
        <p className="admin-measure type-body">
          {survey.topic || "No topic set yet."}
          {survey.targetAudience && (
            <>
              {" "}
              Targeting <strong className="font-semibold">{survey.targetAudience}</strong>.
            </>
          )}
        </p>
      </div>

      <div className="bs-rise-4 mb-10">
        <SectionHeader title="Questions" onEdit={() => setEditing(true)} />
        <p className="type-body-sm mb-2 text-faint">
          The interviewer asks up to 1 follow-up per question, in your brand voice.
        </p>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No question guide yet.</p>
        ) : (
          <div className="flex flex-col">
            {questions.map((question, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-6 py-[18px]",
                  i < questions.length - 1 && "border-b border-chip"
                )}
              >
                <span className="type-body-sm min-w-[26px] font-semibold text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="type-body">{question}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bs-rise-5 mb-10">
        <SectionHeader title="Qualification" />
        <p className="admin-measure type-body mb-4">
          Qualification is a judgment call, not an automatic rule: review a response&apos;s transcript and lead score,
          then mark it <strong className="font-semibold">Qualified</strong> from its detail page.
        </p>
        <div className="admin-measure flex items-center gap-6 rounded-card border border-border bg-card px-5 py-4">
          <span className="type-body flex-1 font-medium">Try the interview yourself</span>
          <Button asChild variant="ghost" size="sm">
            <a href={`/survey/${survey.slug}?test=1`} target="_blank" rel="noreferrer">
            Open respondent view
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            </a>
          </Button>
        </div>
      </div>

      <ReportSection
        surveyId={survey.id}
        initialReport={latestReport}
        completedInterviewCount={completedInterviewCount}
      />

      {survey.respondentChips.length > 0 && (
        <div className="bs-rise-6 mb-10">
          <SectionHeader title="Respondent info collected" onEdit={() => setEditing(true)} />
          <div className="flex flex-wrap gap-2">
            {survey.respondentChips.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 rounded-pill bg-chip px-3 py-1.5 font-archivo text-sm text-card-foreground"
              >
                {chip.label}
                {chip.required && <span className="text-micro font-semibold text-muted-foreground">required</span>}
              </div>
            ))}
          </div>
          <p className="type-body-sm mt-2 text-muted-foreground">Name and email always collected.</p>
        </div>
      )}
    </PageShell>
  );
}
