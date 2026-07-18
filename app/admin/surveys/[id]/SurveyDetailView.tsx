"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SurveyForm, type SurveyFormValues } from "@/components/SurveyForm";
import { cn } from "@/lib/utils";

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

function StatBlock({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="font-serif text-[28px] leading-none text-card-foreground">{value}</div>
      <div className="mt-2 text-[13px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeader({
  title,
  onEdit,
}: {
  title: string;
  onEdit?: () => void;
}) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-card-foreground">{title}</h2>
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
}: {
  survey: SurveyDetailData;
  responseCount: number;
  qualifiedCount: number;
  completionRate: number | null;
  initialValues: SurveyFormValues;
}) {
  const [editing, setEditing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
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

  if (editing) {
    return (
      <Card>
        <div className="flex items-center justify-between border-b border-border p-6 pb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit survey</h2>
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
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bs-rise-1 mb-11">
        <div className="mb-2.5 flex items-center gap-3">
          <Link
            href="/admin/surveys"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-faint transition-colors hover:text-muted-foreground"
          >
            Surveys
          </Link>
          <span className="text-border">/</span>
          <Badge variant={isLive ? "success" : "warning"}>{isLive ? "Live" : "Draft"}</Badge>
        </div>
        <div className="flex items-end justify-between gap-6">
          <h1 className="font-serif text-[40px] font-normal text-card-foreground">{survey.title}</h1>
          <div className="flex shrink-0 gap-2.5">
            {/* ?test=1: owner-verified server-side; lets the admin run the
                interview (even on a draft) without creating a real lead,
                firing the email, or skewing stats. The Share link below
                stays the clean respondent URL. */}
            <Button type="button" variant="secondary" size="sm" asChild>
              <a href={`/survey/${survey.slug}?test=1`} target="_blank" rel="noreferrer">
                Preview interview
              </a>
            </Button>
            <Button type="button" size="sm" onClick={handleShare}>
              {shareCopied ? "Copied!" : "Share link"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
        {survey.externalTitle && (
          <p className="mt-2 text-sm text-muted-foreground">
            {survey.externalTitle} · <span className="font-mono text-[13px]">{survey.slug}</span>
          </p>
        )}
      </div>

      <div className="bs-rise-2 grid grid-cols-3 gap-4 border-t border-border py-7">
        <StatBlock value={responseCount} label="Responses" />
        <StatBlock value={qualifiedCount} label="Qualified leads" />
        <StatBlock value={completionRate !== null ? `${completionRate}%` : "—"} label="Completion rate" />
      </div>

      <div className="bs-rise-3 border-t border-border py-8">
        <SectionHeader title="Audience & goal" onEdit={() => setEditing(true)} />
        <p className="max-w-[620px] text-[16px] leading-[1.65] text-card-foreground">
          {survey.topic || "No topic set yet."}
          {survey.targetAudience && (
            <>
              {" "}
              Targeting <strong className="font-semibold">{survey.targetAudience}</strong>.
            </>
          )}
        </p>
      </div>

      <div className="bs-rise-4 border-t border-border py-8">
        <SectionHeader title="Questions" onEdit={() => setEditing(true)} />
        <p className="mb-2 text-[13px] text-faint">
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
                <span className="min-w-[26px] text-[13px] font-semibold text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[16px] leading-[1.5] text-card-foreground">{question}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bs-rise-5 border-t border-border py-8">
        <SectionHeader title="Qualification" />
        <p className="mb-4 max-w-[620px] text-[16px] leading-[1.65] text-card-foreground">
          Qualification is a judgment call, not an automatic rule: review a response&apos;s transcript and lead score,
          then mark it <strong className="font-semibold">Qualified</strong> from its detail page.
        </p>
        <div className="flex max-w-[620px] items-center gap-6 rounded-card border border-border bg-card px-5 py-4">
          <span className="flex-1 text-sm font-medium text-card-foreground">Try the interview yourself</span>
          <a
            href={`/survey/${survey.slug}?test=1`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo transition-colors hover:text-indigo/80"
          >
            Open respondent view
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>

      {survey.respondentChips.length > 0 && (
        <div className="bs-rise-6 border-t border-border py-8">
          <SectionHeader title="Respondent info collected" onEdit={() => setEditing(true)} />
          <div className="flex flex-wrap gap-2">
            {survey.respondentChips.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-sm text-card-foreground"
              >
                {chip.label}
                {chip.required && <span className="text-xs font-semibold text-muted-foreground">required</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Name and email always collected.</p>
        </div>
      )}
    </div>
  );
}
