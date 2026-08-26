import Link from "next/link";
import type { InterviewMessage } from "@/lib/interview/types";
import { callScriptToText, isPairedPoint, type CallScript } from "@/lib/interview/call-script";
import {
  Badge,
  Button,
  PageHeader,
  PageShell,
  adminBadgeVariants,
} from "@/components/admin/ui";
import { StatusControl } from "@/components/StatusControl";
import { CopyScriptButton } from "./CopyScriptButton";
import { HubSpotSyncControl } from "./HubSpotSyncControl";
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

type BadgeVariant = NonNullable<VariantProps<typeof adminBadgeVariants>["variant"]>;

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  new: "accent",
  contacted: "warning",
  qualified: "accent",
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
  completed: boolean;
  /** Last successful HubSpot sync, or null if it has never synced. */
  hubspotSyncedAt: string | null;
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
    completed,
    hubspotSyncedAt,
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

  return (
    <PageShell>
      <PageHeader
        eyebrow={survey ? survey.title : "Leads"}
        title={respondentName || "Unnamed respondent"}
        badge={
          <>
            <Badge variant={STATUS_BADGE_VARIANT[status] ?? "count"}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
            {isTest && <Badge variant="warning">Test response</Badge>}
          </>
        }
        subtitle={identityLine || undefined}
        actions={scriptText ? <CopyScriptButton text={scriptText} label="Copy call script" /> : undefined}
      />

      {survey && (
        <div className="-mt-4 mb-8">
          <Button asChild variant="ghost" size="sm" className="-ml-3.5">
            <Link href={`/admin/surveys/${survey.id}`}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M10 3.5L5.5 8l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to {survey.title}
            </Link>
          </Button>
        </div>
      )}

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
          <h2 className="type-section-label mb-3">At a glance</h2>
          {summary && <p className="admin-measure type-body">{summary}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {painPoints.map((point, i) => (
              <span
                key={i}
                className="rounded-pill border border-border bg-secondary px-3 py-1.5 font-archivo text-control text-card-foreground"
              >
                {point}
              </span>
            ))}
            {/* Absence is itself worth showing here: a rep skimming for
                leverage should see that none surfaced rather than wonder
                whether the section just failed to render. */}
            {signals.length === 0 && (
              <span className="rounded-pill border border-dashed border-border px-3 py-1.5 font-archivo text-control text-faint">
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
              <h3 className="type-section-label mb-2">Opener</h3>
              <p className="admin-measure type-body mb-6">
                &ldquo;{callScript.opener}&rdquo;
              </p>
            </>
          )}

          {callScript.talkingPoints.length > 0 && (
            <>
              <h3 className="type-section-label mb-3">Talking points</h3>
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
                        <h4 className="type-eyebrow mb-1.5">They said</h4>
                        <p className="type-body italic">
                          &ldquo;{point.said}&rdquo;
                        </p>
                      </div>
                      <div className="p-4">
                        <h4 className="type-eyebrow mb-1.5 text-brand-text">
                          Your angle
                        </h4>
                        <p className="type-body">
                          {point.angle}
                        </p>
                      </div>
                    </li>
                  ) : (
                    // Extracted before points carried a quote, so there is no
                    // left-hand side to render.
                    <li key={i} className="flex gap-3 px-1 py-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control border border-border bg-secondary font-archivo text-micro font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <p className="type-body">
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
          <h2 className="type-section-label mb-4">Signals</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {signals.map((signal) => (
              <div key={signal.label} className="flex flex-col gap-1">
                <dt className="type-table-head">
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
          <summary className="focus-ring type-section-label cursor-pointer list-none rounded-control hover:text-card-foreground">
            Full transcript ({messages.length} messages)
          </summary>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="type-table-head">
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
          <h2 className="type-section-label">Status</h2>
          {source && <p className="type-meta">Source: {source}</p>}
        </div>
        <StatusControl responseId={responseId} initialStatus={status} />
      </section>

      {/* CRM sync. Runs automatically when the interview completes; this is
          the manual retry for when that background run failed. */}
      <HubSpotSyncControl
        responseId={responseId}
        initialSyncedAt={hubspotSyncedAt}
        disabledReason={
          isTest
            ? "Test responses are not synced to HubSpot."
            : !completed
              ? "Sync becomes available once the interview finishes."
              : null
        }
      />
    </PageShell>
  );
}
