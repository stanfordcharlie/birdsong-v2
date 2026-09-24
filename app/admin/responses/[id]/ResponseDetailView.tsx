import Link from "next/link";
import type { InterviewMessage } from "@/lib/interview/types";
import { callScriptToText, type CallScript } from "@/lib/interview/call-script";
import { Badge, Card, PageHeader, PageShell } from "@/components/admin/ui";
import { formatDayMonth } from "@/lib/format";
import type { DisqualifyReason, LeadStatus } from "@/lib/leads/state";
import type { LeadActivityEntry } from "@/lib/leads/activity";
import { ActivityCard } from "./ActivityCard";
import { HubSpotSyncControl } from "./HubSpotSyncControl";
import { LeadHeaderControls, type WorkflowMember, type WorkflowPermissions } from "./LeadHeaderControls";
import { OpeningLineCard } from "./OpeningLineCard";
import { SummaryCard } from "./SummaryCard";

// The page a rep reads in the minute before dialling, in the order they need
// it: who this is, whether the lead is worth the call, what hurts, what to
// say first, and the evidence behind all of it on demand.
//
// The rules:
//
//   - The header carries the lead's stage and owner as controls, and the
//     HubSpot push as the one primary action. Notes and the trail live in
//     the activity card at the foot of the page, after everything a rep
//     reads.
//   - Nothing a rep reads on a call renders below `.type-body`. Only labels
//     and the header's meta line go smaller.
//   - The opening line is the one filled block on the page. Everything else
//     is a white card on the canvas.
//
// Split from page.tsx (the shape app/admin/projects/[id] also uses) so the
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

/** The transcript card's scroll height. Long interviews scroll inside it. */
const TRANSCRIPT_HEIGHT = "max-h-[440px]";

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
  /** Everything the header controls and the activity card need. */
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

  // The verdict card: the summary's first sentence is the headline, and the
  // rest of it plus the two score rationales open beneath it.
  const { headline, rest } = splitHeadline(summary);
  const detail = [rest, fitReason, fitNote].filter((part): part is string => Boolean(part));

  const metaParts: React.ReactNode[] = [
    [role, company].filter(Boolean).join(", ") || null,
    email ? (
      <a
        key="email"
        href={`mailto:${email}`}
        className="focus-ring rounded-control text-card-foreground underline-offset-2 hover:underline"
      >
        {email}
      </a>
    ) : null,
    completed ? formatDayMonth(createdAt) : `Started ${formatDayMonth(createdAt)}`,
    source ? NON_LIVE_SOURCE_LABELS[source] : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Link href="/admin/leads" className="focus-ring rounded-control transition-colors hover:text-card-foreground">
              Leads
            </Link>
            {survey && (
              <>
                <span aria-hidden className="text-faint">
                  /
                </span>
                <Link
                  href={`/admin/projects/${survey.id}`}
                  className="focus-ring rounded-control normal-case tracking-normal text-card-foreground transition-colors hover:underline"
                >
                  {survey.title}
                </Link>
              </>
            )}
          </span>
        }
        title={respondentName || "Unnamed respondent"}
        badge={isTest ? <Badge variant="warning">Test</Badge> : undefined}
        meta={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {metaParts.map((part, i) => (
              <span key={i}>{part}</span>
            ))}
          </span>
        }
        actions={
          <>
            <LeadHeaderControls
              responseId={responseId}
              leadStatus={workflow.leadStatus}
              assignedTo={workflow.assignedTo}
              assigneeName={workflow.assigneeName}
              members={workflow.members}
              currentUserId={workflow.currentUserId}
              permissions={workflow.permissions}
            />
            {/* CRM sync. Runs automatically when the interview completes;
                this is the manual retry for when that background run failed. */}
            <HubSpotSyncControl
              responseId={responseId}
              initialSyncedAt={hubspotSyncedAt}
              disabledReason={isTest ? "Test response" : !completed ? "Interview in progress" : null}
            />
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <SummaryCard
          leadScore={leadScore}
          fitScore={fitScored ? fitScore : null}
          fitNote={
            fitUnavailable
              ? "research unavailable"
              : fitConfidence === "low"
                ? "low confidence"
                : null
          }
          headline={headline}
          detail={detail}
        />

        {painPoints.length > 0 && (
          <section>
            <h2 className="type-eyebrow mb-3">Pain points</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {painPoints.map((point, i) => {
                const { label, quote } = splitPainPoint(point);
                return (
                  <li key={i} className="min-w-0">
                    <Card padding="compact" className="flex h-full flex-col gap-1.5 px-5 py-4">
                      <p className="type-body">{label}</p>
                      {quote && <p className="type-body-sm italic text-muted-foreground">{quote}</p>}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {callScript && <OpeningLineCard script={callScript} scriptText={scriptText} />}

        {signals.length > 0 && (
          <Card>
            <h2 className="type-eyebrow mb-4">Signals</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {signals.map((signal) => (
                <div key={signal.label} className="flex flex-col gap-0.5">
                  <dt className="font-archivo text-micro text-muted-foreground">{signal.label}</dt>
                  <dd className="type-body">{signal.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {/* The source everything above was derived from, worth reaching for
            when a rep doubts one of those derivations. */}
        {messages.length > 0 && (
          <Card padding="flush">
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <h2 className="type-heading">Interview</h2>
              <span className="type-meta tabular-nums">
                {messageCount} {messageCount === 1 ? "message" : "messages"} ·{" "}
                {completed ? "Completed" : "In progress"}
              </span>
            </div>
            <div className={`${TRANSCRIPT_HEIGHT} flex flex-col gap-5 overflow-y-auto px-6 py-5`}>
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="type-eyebrow">{m.role === "assistant" ? "Interviewer" : "Respondent"}</span>
                  <p className="type-body whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <ActivityCard
          responseId={responseId}
          currentUserId={workflow.currentUserId}
          canNote={workflow.permissions.note}
          activity={workflow.activity}
        />
      </div>
    </PageShell>
  );
}

/**
 * The summary's first sentence as the headline, the remainder as detail.
 *
 * A summary is written as a short paragraph whose first sentence states the
 * situation; the rest qualifies it. The card shows only the first sentence
 * until asked. A first sentence too long to read as a headline (or a summary
 * with no sentence break at all) is shown whole, with no detail to open.
 */
const HEADLINE_MAX_LENGTH = 180;

function splitHeadline(summary: string | null): { headline: string | null; rest: string | null } {
  const trimmed = summary?.trim() ?? "";
  if (!trimmed) return { headline: null, rest: null };
  const match = /^([^]+?[.!?])(?:\s+|$)/.exec(trimmed);
  if (!match || match[1].length > HEADLINE_MAX_LENGTH) return { headline: trimmed, rest: null };
  const rest = trimmed.slice(match[0].length).trim();
  return { headline: match[1], rest: rest || null };
}

/**
 * Pain points are stored as plain strings (see the extraction tool schema in
 * `lib/interview/extract.ts`), but the model routinely writes them as a claim
 * and the quote that evidences it, joined by a spaced dash:
 *
 *   No qualification step before leads go to partners - "Everything just
 *   flows through. No qualification step, honestly."
 *
 * Splitting on the first spaced dash gives the card a label line and a quote
 * line instead of one long sentence a rep has to parse mid-dial. Display only:
 * nothing is written back, and a point with no dash simply has no second line.
 */
function splitPainPoint(raw: string): { label: string; quote: string | null } {
  const trimmed = raw.trim();
  // Hyphen or U+2014, written as an escape so the character itself stays out
  // of the source, spaced on both sides. An unspaced hyphen is a compound
  // word, not a separator.
  const match = /\s(?:-|—)\s/.exec(trimmed);
  if (!match) return { label: trimmed, quote: null };

  const label = trimmed.slice(0, match.index).trim();
  const quote = trimmed.slice(match.index + match[0].length).trim();
  // A dash at either end is punctuation, not a split.
  if (!label || !quote) return { label: trimmed, quote: null };
  return { label, quote };
}
