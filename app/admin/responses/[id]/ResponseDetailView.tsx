import Link from "next/link";
import type { InterviewMessage } from "@/lib/interview/types";
import { callScriptToText, isPairedPoint, type CallScript } from "@/lib/interview/call-script";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusControl } from "@/components/StatusControl";
import { CopyScriptButton } from "./CopyScriptButton";
import { ScoreMeter } from "./ScoreMeter";
import type { VariantProps } from "class-variance-authority";

// Layout follows design_handoff templates/respondent-detail (RespondentDetail.dc.html):
// read-first, scores as meters rather than badges, AI reasoning collapsed
// behind a reveal, and the call script scannable as "they said / your angle"
// pairs. Two deliberate departures from that file:
//
//   1. It is drawn in the respondent flow's eggshell palette and Spectral,
//      but this is an admin page. Per DESIGN.md, admin is the stone palette
//      and Archivo, with Young Serif reserved for the one page title. So the
//      structure is the handoff's; the tokens and type roles are admin's, and
//      the page sits next to the leads queue without looking imported.
//   2. Its audio player is dropped. The handoff shows a waveform, a play
//      button and a duration, but interviews here are typed, so there is no
//      recording, no duration, and nothing for that control to do.
//
// The handoff also omits transcript, signals and status, which this page had
// and kept: they are working features, and a visual redesign is not a reason
// to drop them. They sit below the script in the same card language.
//
// Split from page.tsx (the same shape app/admin/surveys/[id] already uses)
// so the rendering is one pure function of plain data, independent of the
// Supabase reads that assemble it.

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  not_a_fit: "Not a fit",
};

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  new: "success",
  contacted: "warning",
  qualified: "success",
  not_a_fit: "outline",
};

export type ResponseDetailData = {
  responseId: string;
  survey: { id: string; title: string } | null;
  respondentName: string | null;
  /** Role, company and email, already joined for display. */
  identityLine: string;
  status: string;
  isTest: boolean;
  source: string | null;
  leadScore: number | null;
  /** One-line justification for the lead score. */
  fitReason: string | null;
  fitScore: number | null;
  fitReasoning: string;
  fitConfidence: string | null;
  summary: string | null;
  painPoints: string[];
  callScript: CallScript | null;
  signals: { label: string; value: string }[];
  messages: InterviewMessage[];
};

export function ResponseDetailView({ data }: { data: ResponseDetailData }) {
  const {
    responseId,
    survey,
    respondentName,
    identityLine,
    status,
    isTest,
    source,
    leadScore,
    fitReason,
    fitScore,
    fitReasoning,
    fitConfidence,
    summary,
    painPoints,
    callScript,
    signals,
    messages,
  } = data;

  const fitUnavailable = fitConfidence === "unavailable";
  const fitLowData = fitConfidence === "low";
  const scriptText = callScript ? callScriptToText(callScript) : "";
  const initial = (respondentName?.trim()?.[0] ?? identityLine.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="admin-container flex flex-col gap-4">
      {survey && (
        <Link
          href={`/admin/surveys/${survey.id}`}
          className="type-label inline-flex w-fit items-center gap-1.5 hover:text-card-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3.5L5.5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {survey.title}
        </Link>
      )}

      {/* Identity row: who they are and the one action a rep wants from this
          page, which is the script on their clipboard before they dial. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-card-foreground">
            {initial}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="type-page-title text-[32px] leading-none">
                {respondentName || "Unnamed respondent"}
              </h1>
              <Badge variant={STATUS_BADGE_VARIANT[status] ?? "default"}>
                {STATUS_LABELS[status] ?? status}
              </Badge>
              {isTest && <Badge variant="warning">Test response</Badge>}
            </div>
            {identityLine && <p className="type-meta break-words">{identityLine}</p>}
          </div>
        </div>
        {scriptText && (
          <CopyScriptButton text={scriptText} label="Copy call script" size="default" />
        )}
      </div>

      {/* Scores, side by side: "did they show friction?" next to "is this
          company worth calling?" — two independent questions a rep weighs
          together, so neither is allowed to read as the headline. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreMeter label="Lead score" score={leadScore} tone="lead">
          {fitReason || null}
        </ScoreMeter>

        <ScoreMeter
          label="Company fit"
          score={fitUnavailable ? null : fitScore}
          tone="fit"
          badge={
            fitUnavailable ? (
              <Badge variant="outline">research unavailable</Badge>
            ) : fitLowData ? (
              <Badge variant="warning">low confidence</Badge>
            ) : null
          }
        >
          {/* The handoff collapses this behind a "Why?" reveal, which assumes
              a short verdict plus longer evidence behind it. Company fit
              produces one 1-2 sentence field (lib/interview/company-fit.ts),
              so there is no second level to reveal and it reads inline. */}
          {fitUnavailable
            ? "Company fit research was unavailable for this response."
            : fitReasoning || null}
        </ScoreMeter>
      </div>

      {/* At a glance: the summary a rep reads in the seconds before dialing,
          with what the respondent actually named underneath it as chips. */}
      {(summary || painPoints.length > 0) && (
        <section className="rounded-card border border-border bg-card p-5">
          <h2 className="type-label mb-3">At a glance</h2>
          {summary && <p className="type-body max-w-[68ch] text-[16px]">{summary}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {painPoints.map((point, i) => (
              <span
                key={i}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-[13px] text-card-foreground"
              >
                {point}
              </span>
            ))}
            {/* Absence is itself worth showing here: a rep skimming for
                leverage should see that none surfaced rather than wonder
                whether the section just failed to render. */}
            {signals.length === 0 && (
              <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-[13px] text-faint">
                No buying signals yet
              </span>
            )}
          </div>
        </section>
      )}

      {/* Call script */}
      {callScript && (
        <section className="rounded-card border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="type-heading">Call script</h2>
            <CopyScriptButton text={scriptText} variant="secondary" />
          </div>

          {callScript.opener && (
            <>
              <h3 className="type-label mb-2">Opener</h3>
              <p className="mb-6 max-w-[68ch] text-[15px] leading-relaxed text-card-foreground">
                &ldquo;{callScript.opener}&rdquo;
              </p>
            </>
          )}

          {callScript.talkingPoints.length > 0 && (
            <>
              <h3 className="type-label mb-3">Talking points</h3>
              <ul className="flex flex-col gap-2.5">
                {callScript.talkingPoints.map((point, i) =>
                  isPairedPoint(point) ? (
                    // The respondent's words on the left, the rep's move on
                    // the right. Stacks on narrow screens so the quote never
                    // compresses into a column too thin to read.
                    <li
                      key={i}
                      className="grid grid-cols-1 overflow-hidden rounded-card border border-border sm:grid-cols-2"
                    >
                      <div className="bg-secondary p-4">
                        <h4 className="type-label mb-1.5 text-[11px] tracking-[0.1em]">They said</h4>
                        <p className="text-[14px] italic leading-relaxed text-card-foreground">
                          &ldquo;{point.said}&rdquo;
                        </p>
                      </div>
                      <div className="p-4">
                        <h4 className="type-label mb-1.5 text-[11px] tracking-[0.1em] text-success">
                          Your angle
                        </h4>
                        <p className="text-[14px] leading-relaxed text-card-foreground">
                          {point.angle}
                        </p>
                      </div>
                    </li>
                  ) : (
                    // Extracted before points carried a quote, so there is no
                    // left-hand side to render.
                    <li key={i} className="flex gap-3 px-1 py-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <p className="text-[14px] leading-relaxed text-card-foreground">
                        {point.angle}
                      </p>
                    </li>
                  )
                )}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <section className="rounded-card border border-border bg-card p-5">
          <h2 className="type-label mb-4">Signals</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {signals.map((signal) => (
              <div key={signal.label} className="flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                  {signal.label}
                </dt>
                <dd className="text-sm leading-relaxed text-card-foreground">{signal.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Transcript, collapsed: the source everything above was derived from,
          worth reaching for when a rep doubts one of those derivations. */}
      {messages.length > 0 && (
        <details className="rounded-card border border-border bg-card p-5">
          <summary className="type-label cursor-pointer list-none hover:text-card-foreground">
            Full transcript ({messages.length} messages)
          </summary>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                  {m.role === "assistant" ? "Interviewer" : "Respondent"}
                </span>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Status */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-card p-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="type-label">Status</h2>
          {source && <p className="type-meta">Source: {source}</p>}
        </div>
        <StatusControl responseId={responseId} initialStatus={status} />
      </section>

      {/* CRM sync placeholder, no real integration yet */}
      <div className="flex items-center gap-3 pb-2">
        <Button type="button" variant="secondary" disabled>
          Push to HubSpot
        </Button>
        <span className="type-meta">Not synced yet.</span>
      </div>
    </div>
  );
}
