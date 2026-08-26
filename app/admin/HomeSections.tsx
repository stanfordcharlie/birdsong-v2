import Link from "next/link";
import { Badge, Button, Card, DataTable, StatRow, StatusDot, type Column } from "@/components/admin/ui";
import { EMPTY_VALUE, formatPercent, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// The Home dashboard's presentational layer (design_handoff_admin_home/
// AdminHome.dc.html). Layout, structure and copy are the handoff's; every
// value resolves through the admin token layer and the components/admin/ui
// primitives, so Home reads as the same product as Leads and Surveys sitting
// next to it.

// The report generator needs three transcripts before it will run
// (app/api/surveys/[id]/report/route.ts), which is what the sticker counts
// toward.
export const REPORT_INTERVIEW_MINIMUM = 3;

export type PriorityLead = {
  id: string;
  name: string;
  initials: string;
  role: string | null;
  company: string | null;
  score: number;
  fitScore: number | null;
  quote: string | null;
  createdAt: string;
};

export type ListeningSurvey = {
  id: string;
  title: string;
  isLive: boolean;
  completedCount: number;
  /** 0-1, completed / started. Null when nobody has started it yet. */
  completionRate: number | null;
};

export type ActivityEvent = {
  id: string;
  name: string;
  initials: string;
  what: string;
  score: number | null;
  createdAt: string;
};

export type WeekStats = {
  awaiting: number;
  completedThisWeek: number;
  /** 0-1 over the last seven days, or null when nothing started in them. */
  completionRate: number | null;
  averageScore: number | null;
};

export type ReportProgress = {
  surveyId: string;
  completedCount: number;
  /** True once the survey has enough interviews for the generator to run. */
  ready: boolean;
};

// --- Small shared pieces ---------------------------------------------------

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn("shrink-0 transition-transform duration-150 group-hover:translate-x-[3px]", className)}
    >
      <path
        d="M7.5 4.5l6 5.5-6 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The handoff's "All leads →" / "All surveys →" / "View all →" action. A bare
// text link that navigates is a ghost Button, not an anchor styled at the
// call site — that rule is what removed nine button shapes from this surface.
function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="ghost" size="sm" className="ml-auto">
      <Link href={href}>
        {children} <span aria-hidden>→</span>
      </Link>
    </Button>
  );
}

function SectionHeader({
  label,
  pill,
  action,
}: {
  label: string;
  pill?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="type-section-label">{label}</span>
      {pill}
      {action}
    </div>
  );
}

function Initials({ children, className }: { children: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill font-archivo font-bold",
        className
      )}
    >
      {children}
    </div>
  );
}

// Score bands, from the handoff: 9+ solid, 7-8 soft green, 5-6 neutral,
// below 5 outlined. Rendered through the shared Badge so the pill's shape,
// padding and weight stay identical to every other badge in admin; only the
// band's own fill/ink is overridden here.
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="outline" size="sm">{EMPTY_VALUE}</Badge>;
  if (score >= 9) return <Badge variant="accent" size="sm" className="bg-brand text-primary-foreground">{score}</Badge>;
  if (score >= 7) return <Badge variant="accent" size="sm">{score}</Badge>;
  if (score >= 5) return <Badge variant="count" size="sm">{score}</Badge>;
  return <Badge variant="outline" size="sm">{score}</Badge>;
}

// --- This week -------------------------------------------------------------

export function WeekStatsStrip({ stats }: { stats: WeekStats }) {
  return (
    <StatRow
      stats={[
        // The only cell that navigates: the other three are readouts with
        // nowhere more specific to go than the page you are already on.
        { label: "Awaiting first contact", value: stats.awaiting, href: "/admin/leads?status=new" },
        { label: "Interviews completed", value: stats.completedThisWeek },
        { label: "Completion rate", value: formatPercent(stats.completionRate) },
        {
          label: "Average lead score",
          value: stats.averageScore === null ? EMPTY_VALUE : stats.averageScore.toFixed(1),
        },
      ]}
    />
  );
}

// --- Worth a call today ----------------------------------------------------

function LeadCard({ lead }: { lead: PriorityLead }) {
  const subtitle = [lead.role, lead.company].filter(Boolean).join(" · ");

  return (
    <Card padding="flush" className="relative px-5 pb-4 pt-5">
      {/* Accent wash bleeding off the top-right corner, clipped by the card's
          own overflow-hidden. Decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-[60px] h-[180px] w-[180px] rounded-pill bg-brand-weak opacity-75 blur-[56px]"
      />

      <div className="relative mb-3.5 flex items-center gap-3">
        <Initials className="h-[42px] w-[42px] bg-brand text-control text-primary-foreground">
          {lead.initials}
        </Initials>
        <div className="min-w-0 flex-1">
          <div className="type-body truncate font-semibold">{lead.name}</div>
          {subtitle && <div className="type-body-sm mt-px truncate text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="type-metric-value text-brand">{lead.score}</div>
          <div className="type-table-head mt-0.5">Score</div>
        </div>
      </div>

      {/* Their own words, not a summary — the tail on the bottom-left corner
          is what makes it read as a quote rather than a callout. */}
      {lead.quote && (
        <div className="relative mb-3.5 rounded-card rounded-bl-[5px] border border-border bg-secondary px-4 py-3">
          <span className="type-body">“{lead.quote}”</span>
        </div>
      )}

      <div className="relative flex items-center gap-3">
        {/* The call script generated for this lead is the drafted intro, and
            it lives on the response detail page. */}
        <Button asChild variant="secondary" size="sm">
          <Link href={`/admin/responses/${lead.id}`}>Draft an intro</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/responses/${lead.id}`}>Transcript</Link>
        </Button>
        <span className="type-body-sm ml-auto whitespace-nowrap text-faint" suppressHydrationWarning>
          {lead.fitScore !== null && `Fit ${lead.fitScore}/10 · `}
          {formatRelativeTime(lead.createdAt)}
        </span>
      </div>
    </Card>
  );
}

export function PriorityLeads({ leads, waiting }: { leads: PriorityLead[]; waiting: number }) {
  return (
    <section className="mb-10">
      <SectionHeader
        label="Worth a call today"
        pill={
          <Badge variant="accent" size="sm">
            {waiting} waiting
          </Badge>
        }
        action={<SectionLink href="/admin/leads?status=new">All leads</SectionLink>}
      />
      {/* Two columns only when there are actually two leads. A lone lead in a
          fixed two-column grid leaves the whole right half empty, which reads
          as a card that failed to load rather than as a short list — same
          reason the report card collapses out of the row below. */}
      <div className={cn("grid grid-cols-1 gap-4", leads.length > 1 && "md:grid-cols-2")}>
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </section>
  );
}

// Replaces the whole section when nothing is waiting — deliberately a single
// calm row rather than an empty two-column grid, so "nothing here" never
// reads as "something failed to load".
export function QuietState({
  liveSurveyCount,
  copyLinkAction,
}: {
  liveSurveyCount: number;
  copyLinkAction: React.ReactNode;
}) {
  return (
    <Card className="mb-10 flex items-center gap-5">
      <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-pill bg-brand-weak">
        <svg width="26" height="24" viewBox="0 0 48 44" fill="none" aria-hidden>
          <path
            d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
            className="fill-brand"
          />
        </svg>
        {/* ws-note carries the drift and is already gated on
            prefers-reduced-motion in globals.css. */}
        <span className="ws-note absolute -right-2 -top-1.5 text-brand" aria-hidden>
          ♫
        </span>
      </div>
      <div className="flex-1">
        <div className="type-heading mb-1">Nothing needs you right now.</div>
        <div className="type-body text-muted-foreground">
          {liveSurveyCount === 0
            ? "No surveys are listening yet. Share a link and anyone who scores 7 or higher shows up here."
            : `${liveSurveyCount === 1 ? "One survey is" : `${liveSurveyCount} surveys are`} out listening. We’ll surface anyone who scores 7 or higher.`}
        </div>
      </div>
      <div className="shrink-0">{copyLinkAction}</div>
    </Card>
  );
}

// --- Out listening ---------------------------------------------------------

export function OutListening({ surveys }: { surveys: ListeningSurvey[] }) {
  return (
    <Card padding="flush">
      <div className="flex items-center gap-3 border-b border-chip px-5 py-3.5">
        <span className="type-section-label">Out listening</span>
        <SectionLink href="/admin/surveys">All surveys</SectionLink>
      </div>
      {surveys.map((survey) =>
        survey.isLive ? (
          <Link
            key={survey.id}
            href={`/admin/surveys/${survey.id}`}
            className="focus-ring group grid grid-cols-[1fr_150px_92px] items-center gap-4 border-b border-chip px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <StatusDot live />
              <span className="type-body-sm truncate font-semibold">{survey.title}</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-pill bg-chip">
              <div
                className="h-full rounded-pill bg-brand"
                style={{ width: `${Math.round((survey.completionRate ?? 0) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="type-body-sm whitespace-nowrap text-muted-foreground">
                {survey.completedCount} done
              </span>
              <Chevron className="text-faint" />
            </div>
          </Link>
        ) : (
          // Drafts sit last and carry no progress track: there is nothing to
          // measure until someone can actually answer them.
          <Link
            key={survey.id}
            href={`/admin/surveys/${survey.id}`}
            className="focus-ring group flex items-center gap-2.5 border-b border-chip px-5 py-3.5 transition-colors last:border-b-0 hover:bg-secondary"
          >
            <StatusDot live={false} />
            <span className="type-body-sm truncate font-semibold text-muted-foreground">
              {survey.title} · draft, never launched
            </span>
            <Chevron className="ml-auto text-faint" />
          </Link>
        )
      )}
    </Card>
  );
}

// --- Industry report -------------------------------------------------------

// The sticker card. It used to borrow the marketing --lp-butter-* pair to
// read as "a different kind of thing" from the lead cards beside it; that
// fill is a cream, which is banned, and reaching across to a marketing token
// from admin was the wrong escape hatch anyway. The distinction now comes
// from the accent tint plus the sticker itself rather than from a second
// palette.
export function ReportCard({ report }: { report: ReportProgress }) {
  const remaining = REPORT_INTERVIEW_MINIMUM - report.completedCount;

  return (
    <Card className="relative bg-brand-weak">
      <svg
        className="absolute -right-[13px] -top-[15px]"
        width="58"
        height="58"
        viewBox="0 0 60 60"
        aria-hidden
      >
        <g transform="rotate(-8 30 30)">
          <polygon
            points="30,2 35.36,17.07 49.8,10.2 42.93,24.64 58,30 42.93,35.36 49.8,49.8 35.36,42.93 30,58 24.64,42.93 10.2,49.8 17.07,35.36 2,30 17.07,24.64 10.2,10.2 24.64,17.07"
            fill="hsl(var(--ds-accent-weak))"
            stroke="hsl(var(--ds-card-foreground))"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
        <text
          x="30"
          y="34.5"
          textAnchor="middle"
          className="font-serif"
          fontSize="12"
          fill="hsl(var(--ds-card-foreground))"
        >
          {Math.min(report.completedCount, REPORT_INTERVIEW_MINIMUM)}/{REPORT_INTERVIEW_MINIMUM}
        </text>
      </svg>

      <div className="type-section-label mb-2.5 text-brand-text">Industry report</div>
      <div className="type-heading mb-2 max-w-[20ch] leading-[1.25]">
        {report.ready
          ? "You have enough interviews to draft the report."
          : remaining === 1
            ? "One more interview and your report drafts itself."
            : `${remaining} more interviews and your report drafts itself.`}
      </div>
      <div className="type-body-sm mb-3.5 text-brand-text">
        Pain themes across everyone who answered, ready to send back to them.
      </div>
      <Button asChild variant="ghost" size="sm" className="-ml-3.5 text-brand-text">
        <Link href={`/admin/surveys/${report.surveyId}`}>
          {report.ready ? "Draft the report" : "Preview the draft"} <span aria-hidden>→</span>
        </Link>
      </Button>
    </Card>
  );
}

// --- What's been happening -------------------------------------------------

const ACTIVITY_COLUMNS: Column<ActivityEvent>[] = [
  {
    key: "person",
    header: "Person",
    cell: (event) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <Initials className="h-[30px] w-[30px] bg-chip text-micro text-muted-foreground">
          {event.initials}
        </Initials>
        <span className="truncate font-semibold">{event.name}</span>
      </span>
    ),
  },
  { key: "what", header: "Activity", cell: (event) => <span className="text-muted-foreground">{event.what}</span> },
  { key: "score", header: "Score", width: "80px", cell: (event) => <ScoreBadge score={event.score} /> },
  {
    key: "when",
    header: "When",
    align: "right",
    width: "96px",
    cell: (event) => (
      <span className="text-faint" suppressHydrationWarning>
        {formatRelativeTime(event.createdAt)}
      </span>
    ),
  },
];

export function ActivityTable({ events }: { events: ActivityEvent[] }) {
  return (
    <section>
      <SectionHeader
        label="What’s been happening"
        action={<SectionLink href="/admin/leads">View all</SectionLink>}
      />
      <Card padding="flush">
        <DataTable
          columns={ACTIVITY_COLUMNS}
          rows={events}
          rowKey={(event) => event.id}
          rowHref={(event) => `/admin/responses/${event.id}`}
          empty={{ title: "Nothing yet", description: "Completed interviews show up here as they land." }}
        />
      </Card>
    </section>
  );
}
