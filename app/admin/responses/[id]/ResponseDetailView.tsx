import Link from "next/link";
import type { InterviewMessage } from "@/lib/interview/types";
import { callScriptToText, type CallScript } from "@/lib/interview/call-script";
import { renderEmphasis } from "@/lib/chat/render-emphasis";
import { Badge, Card, PageShell, PageTopBar, ScoreChip } from "@/components/admin/ui";
import { border, dot, text } from "@/components/admin/ui/tokens";
import { formatAbsolute, formatRelativeTime } from "@/lib/format";
import type { DisqualifyReason, LeadStatus } from "@/lib/leads/state";
import type { LeadActivityEntry } from "@/lib/leads/activity";
import { cn } from "@/lib/utils";
import { ActivityCard } from "./ActivityCard";
import { LeadActionBar } from "./LeadActionBar";
import { LeadHeaderControls, type WorkflowMember, type WorkflowPermissions } from "./LeadHeaderControls";
import { LeadTabs, type LeadTab } from "./LeadTabs";
import { OpeningLineCard } from "./OpeningLineCard";
import { SummaryCard } from "./SummaryCard";

// The page a rep reads in the minute before dialling. Built from
// design/mockups/Lead.html:
//
//   - The top bar carries the lead's stage and owner.
//   - The score tile and the name head the page; the interview and what was
//     made of it sit under tabs, transcript first.
//   - The right column holds the facts (Details) and the reason for the
//     score.
//   - The floating bar holds the two things a rep does with a lead: copy the
//     call script, push to HubSpot.
//
// Split from page.tsx (the shape app/admin/projects/[id] also uses) so the
// rendering is one pure function of plain data.

/**
 * Source values that mean "this response is not real traffic". A live response
 * carries either no source or a `?src=` campaign value, and neither belongs
 * among the facts a rep skims before a call.
 */
const NON_LIVE_SOURCE_LABELS: Record<string, string> = {
  seed: "Seeded",
  "test-hubspot-sync": "Sync test",
};

/**
 * The longest gap between start and completion that is shown as the
 * interview's length. A respondent who came back the next day did not give a
 * nineteen-hour interview, so past this the header says nothing.
 */
const DURATION_MAX_MINUTES = 180;

export type ResponseDetailData = {
  responseId: string;
  /**
   * The study this response belongs to, straight off the row. `survey` below
   * is the looked-up study and can be null (a study deleted out from under a
   * response); this id always exists, which is what the delete needs to know
   * where to send the admin next.
   */
  surveyId: string;
  survey: { id: string; title: string } | null;
  respondentName: string | null;
  /** Job title, from the respondent's custom fields. */
  role: string | null;
  company: string | null;
  email: string | null;
  isTest: boolean;
  completed: boolean;
  /** When the interview was started. */
  createdAt: string;
  /** When it was completed. Null while in progress, and on older rows. */
  completedAt: string | null;
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
  /** Everything the top bar controls and the activity card need. */
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

const MONO = "font-mono";

type DetailRow = { label: string; value: React.ReactNode; title?: string };

export function ResponseDetailView({ data }: { data: ResponseDetailData }) {
  const {
    responseId,
    surveyId,
    survey,
    respondentName,
    role,
    company,
    email,
    isTest,
    completed,
    createdAt,
    completedAt,
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

  // The summary's first sentence is the headline, and the rest of it plus
  // the two score rationales open beneath it.
  const { headline, rest } = splitHeadline(summary);
  const detail = [rest, fitReason, fitNote].filter((part): part is string => Boolean(part));

  // No H1 carries a terminal period (the rule PageHeader enforces).
  const name = (respondentName || "Unnamed respondent").replace(/\.$/, "");
  const firstName = respondentName?.trim().split(/\s+/)[0] || "Respondent";

  const durationMinutes = interviewMinutes(createdAt, completedAt);
  const who = role && company ? `${role} at ${company}` : (role ?? company);
  const rationale = leadScore !== null ? splitSentences(fitReason) : [];
  const sourceLabel = source ? NON_LIVE_SOURCE_LABELS[source] : undefined;

  const detailRows: (DetailRow | null)[] = [
    company ? { label: "Company", value: company, title: company } : null,
    role ? { label: "Title", value: role, title: role } : null,
    email
      ? {
          label: "Email",
          title: email,
          value: (
            <a
              href={`mailto:${email}`}
              className="focus-ring rounded-[var(--ds-radius-chip)] hover:text-[color:hsl(var(--ds-accent))]"
            >
              {email}
            </a>
          ),
        }
      : null,
    fitScored
      ? {
          label: "Fit",
          value: (
            <>
              <span className={MONO}>{fitScore}</span> of <span className={MONO}>10</span>
              {fitConfidence === "low" && <span className={text.muted2}>, low confidence</span>}
            </>
          ),
        }
      : fitUnavailable
        ? { label: "Fit", value: <span className={text.muted2}>Research unavailable</span> }
        : null,
    survey
      ? {
          label: "Study",
          title: survey.title,
          value: (
            <Link
              href={`/admin/projects/${survey.id}`}
              className="focus-ring rounded-[var(--ds-radius-chip)] hover:text-[color:hsl(var(--ds-accent))]"
            >
              {survey.title}
            </Link>
          ),
        }
      : null,
    {
      label: completed ? "Completed" : "Started",
      value: <span className={MONO}>{formatAbsolute(completed ? (completedAt ?? createdAt) : createdAt)}</span>,
    },
    sourceLabel ? { label: "Source", value: sourceLabel } : null,
    {
      label: "HubSpot",
      value: hubspotSyncedAt ? (
        <span title={formatAbsolute(hubspotSyncedAt)}>
          Pushed <span className={MONO}>{formatRelativeTime(hubspotSyncedAt)}</span>
        </span>
      ) : (
        <span className={text.muted2}>Not pushed</span>
      ),
    },
  ];
  const details = detailRows.filter((row): row is DetailRow => row !== null);

  const tabs: { value: LeadTab; label: string; panel: React.ReactNode }[] = [];

  if (messages.length > 0) {
    tabs.push({
      value: "transcript",
      label: "Transcript",
      panel: (
        <div className="flex max-w-[720px] flex-col gap-5">
          {messages.map((message, i) => {
            const interviewer = message.role === "assistant";
            return (
              <div key={i} className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-4">
                <span className={cn("text-[12px] font-bold", interviewer ? text.muted2 : text.ink)}>
                  {interviewer ? "Birdsong" : firstName}
                </span>
                <p
                  className={cn(
                    "ds-transcript whitespace-pre-wrap break-words",
                    interviewer ? text.muted : text.ink
                  )}
                >
                  {interviewer ? renderEmphasis(message.content) : message.content}
                </p>
              </div>
            );
          })}
        </div>
      ),
    });
  }

  tabs.push({
    value: "summary",
    label: "Summary",
    panel: (
      <div className="flex flex-col gap-5">
        <SummaryCard
          leadScore={leadScore}
          fitScore={fitScored ? fitScore : null}
          fitNote={
            fitUnavailable ? "research unavailable" : fitConfidence === "low" ? "low confidence" : null
          }
          headline={headline}
          detail={detail}
        />

        {painPoints.length > 0 && (
          <Card header="Pain points" padding="flush">
            <ul>
              {painPoints.map((point, i) => {
                const { label, quote } = splitPainPoint(point);
                return (
                  <li
                    key={i}
                    className={cn("flex flex-col gap-1 px-5 py-3", i > 0 && "border-t", border.base)}
                  >
                    <p className="ds-body">{label}</p>
                    {quote && <p className={cn("ds-small italic", text.muted2)}>{quote}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {signals.length > 0 && (
          <Card header="Signals" padding="flush">
            <dl>
              {signals.map((signal, i) => (
                <div
                  key={signal.label}
                  className={cn(
                    "grid grid-cols-[140px_minmax(0,1fr)] gap-3 px-5 py-[10px]",
                    i > 0 && "border-t",
                    border.base
                  )}
                >
                  <dt className={cn("ds-small", text.muted2)}>{signal.label}</dt>
                  <dd className="ds-body">{signal.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>
    ),
  });

  if (callScript) {
    tabs.push({
      value: "script",
      label: "Call script",
      panel: <OpeningLineCard script={callScript} scriptText={scriptText} />,
    });
  }

  tabs.push({
    value: "activity",
    label: "Activity",
    panel: (
      <ActivityCard
        responseId={responseId}
        currentUserId={workflow.currentUserId}
        canNote={workflow.permissions.note}
        activity={workflow.activity}
      />
    ),
  });

  return (
    // 110px at the foot, so the last line scrolls clear of the floating bar.
    <PageShell className="pb-[110px]">
      <PageTopBar
        crumbs={[{ label: "Leads", href: "/admin/leads" }, { label: name }]}
        actions={
          <LeadHeaderControls
            responseId={responseId}
            surveyId={surveyId}
            leadStatus={workflow.leadStatus}
            assignedTo={workflow.assignedTo}
            assigneeName={workflow.assigneeName}
            members={workflow.members}
            currentUserId={workflow.currentUserId}
            permissions={workflow.permissions}
          />
        }
      />

      <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Interview" className="flex min-w-0 flex-col gap-[22px]">
          <div className="flex items-center gap-4">
            <ScoreChip score={leadScore} size="hero" />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className={cn("ds-h1 text-[28px]", text.ink)}>{name}</h1>
                {isTest && <Badge variant="warning">Test</Badge>}
              </div>
              <p className={cn("ds-body", text.muted2)}>
                {[
                  who,
                  survey?.title,
                  <span key="length">
                    {durationMinutes !== null && (
                      <>
                        <span className={MONO}>{durationMinutes}</span> min,{" "}
                      </>
                    )}
                    <span className={MONO}>{messageCount}</span> {messageCount === 1 ? "turn" : "turns"}
                    {!completed && ", in progress"}
                  </span>,
                ]
                  .filter(Boolean)
                  .map((part, i) => (
                    <span key={i}>
                      {i > 0 && " · "}
                      {part}
                    </span>
                  ))}
              </p>
            </div>
          </div>

          <LeadTabs tabs={tabs} />
        </section>

        <aside aria-label="Details" className="flex flex-col gap-4 pt-1">
          <Card header="Details" padding="flush">
            <dl>
              {details.map((row, i) => (
                <div
                  key={row.label}
                  className={cn(
                    "grid grid-cols-[100px_minmax(0,1fr)] gap-3 px-5 py-[10px] text-[13px]",
                    i > 0 && "border-t",
                    border.base
                  )}
                >
                  <dt className={text.muted2}>{row.label}</dt>
                  <dd title={row.title} className="truncate font-semibold">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {rationale.length > 0 && (
            <Card
              header={
                <>
                  Why it scored <span className={MONO}>{leadScore}</span>
                </>
              }
              padding="flush"
            >
              <ul className="flex flex-col gap-[10px] px-5 py-[14px] text-[13px] leading-[1.5]">
                {rationale.map((line, i) => (
                  <li key={i} className="flex gap-[10px]">
                    <span
                      aria-hidden
                      className={cn("mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full", dot.accent)}
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <LeadActionBar
        responseId={responseId}
        scriptText={scriptText}
        canPush={workflow.permissions.pushToCrm}
        disabledReason={isTest ? "Test response" : !completed ? "Interview in progress" : null}
      />
    </PageShell>
  );
}

/** Whole minutes between start and completion, or null when that is not a length. */
function interviewMinutes(startedAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return minutes > DURATION_MAX_MINUTES ? null : minutes;
}

/**
 * The score rationale as one line per sentence. It is stored as a single
 * string; this only breaks it where it already ends a sentence, so each
 * reason gets its own bullet. Display only.
 */
function splitSentences(reason: string | null): string[] {
  const trimmed = reason?.trim() ?? "";
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
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
 * Splitting on the first spaced dash gives the row a label line and a quote
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
