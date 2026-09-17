import Link from "next/link";
import type { InterviewMessage } from "@/lib/interview/types";
import { callScriptToText, isPairedPoint, type CallScript } from "@/lib/interview/call-script";
import { Badge, PageHeader, PageShell, StatRow } from "@/components/admin/ui";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { EMPTY_VALUE, formatDate } from "@/lib/format";
import type { DisqualifyReason, LeadStatus } from "@/lib/leads/state";
import type { LeadActivityEntry } from "@/lib/leads/activity";
import { CopyScriptButton } from "./CopyScriptButton";
import { HubSpotSyncControl } from "./HubSpotSyncControl";
import { LeadWorkflowPanel, type WorkflowMember, type WorkflowPermissions } from "./LeadWorkflowPanel";
import { Section } from "./Section";

// The page a rep reads in the minute before dialling, in the order they need
// it: who this is, whether the lead is worth the call, why they qualify, what
// to actually say, and the evidence behind all of it on demand.
//
// The rules:
//
//   - The header carries the HubSpot control and the status as a badge; the
//     status control itself, assignment, notes and the trail live together
//     in the workflow panel above the transcript, because that is the part
//     of the page a rep writes to, and it sits after everything they read.
//   - Nothing a rep reads on a call renders below `.type-body`. Only labels
//     and the header's meta line go smaller.
//   - Scores are one `StatRow`, the same stat treatment as every other admin
//     page.
//   - Sections are ruled, not carded: whitespace and a hairline separate
//     them. A quote gets a left rule, never a filled block.
//
// Split from page.tsx (the shape app/admin/surveys/[id] also uses) so the
// rendering is one pure function of plain data.

/**
 * Source values that mean "this response is not real traffic". A live response
 * carries either no source or a `?src=` campaign value, and neither belongs in
 * a meta line a rep skims before a call.
 */
const NON_LIVE_SOURCE_LABELS: Record<string, string> = {
  seed: "Seeded",
  "test-hubspot-sync": "Sync test",
};

export type ResponseDetailData = {
  responseId: string;
  survey: { id: string; title: string } | null;
  respondentName: string | null;
  /** Job title, from the respondent's custom fields. */
  role: string | null;
  company: string | null;
  email: string | null;
  isTest: boolean;
  completed: boolean;
  /** When the interview was taken. Displayed in the header's meta line. */
  createdAt: string;
  messageCount: number;
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
  /** Everything the workflow panel needs. Rendered above the transcript. */
  workflow: {
    leadStatus: LeadStatus;
    assignedTo: string | null;
    assigneeName: string | null;
    disqualifyReason: DisqualifyReason | null;
    disqualifyNote: string | null;
    members: WorkflowMember[];
    currentUserId: string;
    permissions: WorkflowPermissions;
    activity: LeadActivityEntry[];
  };
};

export function ResponseDetailView({ data }: { data: ResponseDetailData }) {
  const {
    responseId,
    survey,
    respondentName,
    role,
    company,
    email,
    isTest,
    completed,
    createdAt,
    messageCount,
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
    workflow,
  } = data;

  const fitUnavailable = fitConfidence === "unavailable";
  const fitScored = !fitUnavailable && fitScore !== null;
  const scriptText = callScript ? callScriptToText(callScript) : "";

  // Company fit research runs against the company, not the interview, so its
  // reasoning is only worth a line when it actually produced one.
  const fitNote = fitScored && fitReasoning ? fitReasoning : null;

  const metaParts: React.ReactNode[] = [
    [role, company].filter(Boolean).join(" · ") || null,
    email ? (
      <a
        key="email"
        href={`mailto:${email}`}
        className="focus-ring rounded-control underline underline-offset-2 hover:text-card-foreground"
      >
        {email}
      </a>
    ) : null,
    `${completed ? "Completed" : "Started"} ${formatDate(createdAt)}`,
    `${messageCount} ${messageCount === 1 ? "message" : "messages"}`,
    source ? NON_LIVE_SOURCE_LABELS[source] : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          survey ? (
            <Link
              href={`/admin/surveys/${survey.id}`}
              className="focus-ring rounded-control transition-colors hover:text-card-foreground"
            >
              {survey.title}
            </Link>
          ) : (
            <Link href="/admin/leads" className="focus-ring rounded-control hover:text-card-foreground">
              Leads
            </Link>
          )
        }
        title={respondentName || "Unnamed respondent"}
        // The lead's stage, and the test marker when it applies: the two
        // things about this record that change what a rep should do with it.
        badge={
          <>
            <LeadStatusBadge status={workflow.leadStatus} />
            {isTest && <Badge variant="warning">Test</Badge>}
          </>
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {metaParts.map((part, i) => (
              <span key={i} className="inline-flex items-center gap-x-2">
                {i > 0 && <span aria-hidden>·</span>}
                {part}
              </span>
            ))}
          </span>
        }
        actions={
          // CRM sync. Runs automatically when the interview completes; this
          // is the manual retry for when that background run failed.
          <HubSpotSyncControl
            responseId={responseId}
            initialSyncedAt={hubspotSyncedAt}
            disabledReason={isTest ? "Test response" : !completed ? "Interview in progress" : null}
          />
        }
      />

      <div className="flex flex-col gap-8">
        {/* Two independent questions a rep weighs together: did this person
            show friction, and is the company worth the hour. Neither is
            allowed to read as the headline, which is what one shared stat row
            enforces. */}
        <StatRow
          stats={[
            {
              label: "Lead score",
              value: leadScore === null ? EMPTY_VALUE : `${leadScore}/10`,
            },
            {
              label: "Company fit",
              value: fitScored ? `${fitScore}/10` : EMPTY_VALUE,
              delta: fitUnavailable
                ? "Research unavailable"
                : fitConfidence === "low"
                  ? "Low confidence"
                  : undefined,
            },
          ]}
        />

        {(summary || fitReason || fitNote) && (
          <Section label="Summary">
            <div className="admin-measure flex flex-col gap-2">
              {summary && <p className="type-body">{summary}</p>}
              {/* The lead score's own rationale: a different field from the
                  summary, saying why the person is or is not a fit. Muted,
                  because it supports the paragraph above. */}
              {fitReason && <p className="type-body text-muted-foreground">{fitReason}</p>}
              {fitNote && <p className="type-body text-muted-foreground">{fitNote}</p>}
            </div>
          </Section>
        )}

        {painPoints.length > 0 && (
          <Section label="Pain points">
            <ul className="admin-measure flex flex-col gap-3">
              {painPoints.map((point, i) => {
                const { label, quote } = splitPainPoint(point);
                return (
                  <li key={i}>
                    <p className="type-body">{label}</p>
                    {quote && (
                      <p className="type-body mt-1 border-l border-border pl-3 italic text-muted-foreground">
                        {quote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {callScript && (
          <Section label="Call script" action={<CopyScriptButton text={scriptText} variant="secondary" />}>
            {callScript.opener && (
              <p className="admin-measure type-body mb-4">&ldquo;{callScript.opener}&rdquo;</p>
            )}

            {callScript.talkingPoints.length > 0 && (
              <ul className="flex flex-col">
                {callScript.talkingPoints.map((point, i) =>
                  isPairedPoint(point) ? (
                    // The respondent's words on the left, the rep's move on
                    // the right. Stacks on narrow screens so the quote never
                    // compresses into a column too thin to read.
                    <li
                      key={i}
                      className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-2"
                    >
                      <p className="type-body border-l border-border pl-3 italic text-muted-foreground">
                        {point.said}
                      </p>
                      <p className="type-body">{point.angle}</p>
                    </li>
                  ) : (
                    // Extracted before points carried a quote, so there is
                    // no left-hand side to render.
                    <li key={i} className="border-t border-border py-3 first:border-t-0 first:pt-0">
                      <p className="type-body">{point.angle}</p>
                    </li>
                  )
                )}
              </ul>
            )}
          </Section>
        )}

        {signals.length > 0 && (
          <Section label="Signals">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {signals.map((signal) => (
                <div key={signal.label} className="flex flex-col gap-0.5">
                  <dt className="font-archivo text-micro text-muted-foreground">{signal.label}</dt>
                  <dd className="type-body">{signal.value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {/* Where the rep writes: status, assignment, notes, and the trail
            of everything that has happened to this lead. */}
        <LeadWorkflowPanel responseId={responseId} {...workflow} />

        {/* The source everything above was derived from, worth reaching for
            when a rep doubts one of those derivations. */}
        {messages.length > 0 && (
          <section className="border-t border-border pt-4">
            <details>
              <summary className="focus-ring type-eyebrow cursor-pointer list-none rounded-control tabular-nums hover:text-card-foreground">
                Transcript · {messages.length} messages
              </summary>
              <div className="admin-measure mt-3 flex flex-col gap-4 border-l border-border pl-4">
                {messages.map((m, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="type-eyebrow">
                      {m.role === "assistant" ? "Interviewer" : "Respondent"}
                    </span>
                    <p className="type-body whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}
      </div>
    </PageShell>
  );
}

/**
 * Pain points are stored as plain strings (see the extraction tool schema in
 * `lib/interview/extract.ts`), but the model routinely writes them as a claim
 * and the quote that evidences it, joined by a spaced dash:
 *
 *   No qualification step before leads go to partners - "Everything just
 *   flows through. No qualification step, honestly."
 *
 * Splitting on the first spaced dash gives the row a label line and a quote
 * line instead of one long sentence a rep has to parse mid-dial. Display only:
 * nothing is written back, and a point with no dash simply has no second line.
 */
function splitPainPoint(raw: string): { label: string; quote: string | null } {
  const trimmed = raw.trim();
  // Hyphen or U+2014, written as an escape so the character itself stays out
  // of the source, spaced on both sides. An unspaced hyphen is a compound
  // word, not a separator.
  const match = /\s(?:-|\u2014)\s/.exec(trimmed);
  if (!match) return { label: trimmed, quote: null };

  const label = trimmed.slice(0, match.index).trim();
  const quote = trimmed.slice(match.index + match[0].length).trim();
  // A dash at either end is punctuation, not a split.
  if (!label || !quote) return { label: trimmed, quote: null };
  return { label, quote };
}
