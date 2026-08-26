import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

// The Home dashboard's presentational layer (design_handoff_admin_home/
// AdminHome.dc.html). The handoff was drawn in its own warm eggshell palette
// with Spectral display type; everything here resolves through the shipped
// admin --ds-* tokens and the DESIGN.md type scale instead, so Home reads as
// the same product as Leads and Surveys sitting next to it. Layout, spacing,
// structure and copy are the handoff's.
//
// Token mapping, once, so no call site below has to re-derive it:
//   handoff #faf8f1 ground      -> bg-page (already on AdminShell)
//   handoff #fffefa surface     -> bg-card
//   handoff #f6efe1 raised      -> bg-secondary   (row hover, speech bubble)
//   handoff #f0e8d7 hairline    -> border-chip    (dividers inside a card)
//   handoff #e9e3d3 border      -> border-border  (the card outline itself)
//   handoff #241f18 ink         -> text-card-foreground
//   handoff #6f6757 muted       -> text-muted-foreground
//   handoff #a89d88 faint       -> text-faint
//   handoff #3a6046 / #e4ecdd   -> text-success / bg-success-bg (exact match)
//
// The handoff's green/blue accent switch has no equivalent here: admin's
// `accent` token is a neutral grey fill (#edece8), not a hue, so the accent
// is `success` — the one token that already carries the handoff's #3a6046.

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

// The handoff's "All leads →" / "All surveys →" / "View all →" action. Sits
// on the accent rather than on ink so it reads as a way out of the section
// rather than as the section's own title.
function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="ml-auto text-[12.5px] font-bold text-success transition-colors hover:underline"
    >
      {children} <span aria-hidden>→</span>
    </Link>
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
    <div className="mb-[13px] flex items-center gap-3">
      <span className="type-label">{label}</span>
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
        "flex shrink-0 items-center justify-center rounded-full font-bold",
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
  if (score === null) {
    return (
      <Badge variant="outline" className="px-[9px] py-0.5 text-faint">
        —
      </Badge>
    );
  }
  if (score >= 9) {
    return (
      <Badge variant="success" className="bg-success px-[9px] py-0.5 text-success-foreground">
        {score}
      </Badge>
    );
  }
  if (score >= 7) {
    return (
      <Badge variant="success" className="px-[9px] py-0.5">
        {score}
      </Badge>
    );
  }
  if (score >= 5) {
    return (
      <Badge variant="default" className="px-[9px] py-0.5 text-muted-foreground">
        {score}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="px-[9px] py-0.5 text-faint">
      {score}
    </Badge>
  );
}

// --- This week -------------------------------------------------------------

// One cell of the masthead stat strip. Label left, number hard right, both on
// the same baseline — at four-across the label is what you scan and the
// number is what you land on.
//
// Borders do the dividing rather than gaps, so the strip reads as one ruled
// object: stacked on narrow screens the rule runs horizontally, and from `sm`
// up it flips to the vertical hairlines between columns.
const STAT_CELL =
  "flex items-baseline gap-3 border-t border-chip px-[22px] py-[17px] first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0";

function StatCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <>
      <span className="flex-1 text-[13px] leading-snug text-muted-foreground">{label}</span>
      {/* Archivo, not a serif: DESIGN.md keeps the display face to the one
          page title per page, stat values explicitly included. */}
      <span className="text-[26px] font-semibold leading-none tracking-[-0.01em] text-card-foreground">
        {value}
        {suffix}
      </span>
    </>
  );
}

export function WeekStatsStrip({ stats }: { stats: WeekStats }) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-card border border-border bg-card shadow-[0_4px_14px_rgba(28,25,23,0.06)] sm:grid-cols-4">
      {/* The only cell that navigates: the other three are readouts with
          nowhere more specific to go than the page you are already on. */}
      <Link
        href="/admin/leads?status=new"
        className={cn(STAT_CELL, "transition-colors hover:bg-secondary")}
      >
        <StatCell label="Awaiting first contact" value={stats.awaiting} />
      </Link>
      <div className={STAT_CELL}>
        <StatCell label="Interviews completed" value={stats.completedThisWeek} />
      </div>
      <div className={STAT_CELL}>
        <StatCell
          label="Completion rate"
          value={stats.completionRate === null ? "—" : Math.round(stats.completionRate * 100)}
          suffix={
            stats.completionRate === null ? null : (
              <span className="text-[15px] text-faint">%</span>
            )
          }
        />
      </div>
      <div className={STAT_CELL}>
        <StatCell
          label="Average lead score"
          value={stats.averageScore === null ? "—" : stats.averageScore.toFixed(1)}
        />
      </div>
    </div>
  );
}

// --- Worth a call today ----------------------------------------------------

function LeadCard({ lead }: { lead: PriorityLead }) {
  const subtitle = [lead.role, lead.company].filter(Boolean).join(" · ");

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-border bg-card px-[22px] pb-[18px] pt-5 shadow-[0_4px_14px_rgba(28,25,23,0.06)]">
      {/* Accent wash bleeding off the top-right corner, clipped by the card's
          own overflow-hidden. Decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-[60px] h-[180px] w-[180px] rounded-full bg-success-bg opacity-75 blur-[56px]"
      />

      <div className="relative mb-[14px] flex items-center gap-[13px]">
        <Initials className="h-[42px] w-[42px] bg-success text-[13.5px] text-success-foreground">
          {lead.initials}
        </Initials>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px] font-semibold text-card-foreground">{lead.name}</div>
          {subtitle && (
            <div className="mt-px truncate text-[12.5px] text-muted-foreground">{subtitle}</div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[26px] font-semibold leading-none tracking-[-0.01em] text-success">
            {lead.score}
          </div>
          <div className="mt-[3px] text-[10.5px] font-bold uppercase tracking-[0.09em] text-faint">
            Score
          </div>
        </div>
      </div>

      {/* Their own words, not a summary — the tail on the bottom-left corner
          is what makes it read as a quote rather than a callout. */}
      {lead.quote && (
        <div className="relative mb-[14px] rounded-[16px_16px_16px_5px] border border-border bg-secondary px-4 py-[13px]">
          <span className="text-[15px] leading-[1.5] text-card-foreground">“{lead.quote}”</span>
        </div>
      )}

      <div className="relative flex items-center gap-3">
        {/* The call script generated for this lead is the drafted intro, and
            it lives on the response detail page. */}
        <Button asChild variant="secondary" size="sm" className="hover:border-faint/50">
          <Link href={`/admin/responses/${lead.id}`}>Draft an intro</Link>
        </Button>
        <Link
          href={`/admin/responses/${lead.id}`}
          className="text-[12.5px] font-semibold text-muted-foreground transition-colors hover:underline"
        >
          Transcript
        </Link>
        <span className="ml-auto whitespace-nowrap text-xs text-faint" suppressHydrationWarning>
          {lead.fitScore !== null && `Fit ${lead.fitScore}/10 · `}
          {formatRelativeTime(lead.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function PriorityLeads({ leads, waiting }: { leads: PriorityLead[]; waiting: number }) {
  return (
    <section className="mb-[30px]">
      <SectionHeader
        label="Worth a call today"
        pill={
          <span className="rounded-full border border-success/25 bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold text-success">
            {waiting} waiting
          </span>
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
    <section className="mb-[30px] flex items-center gap-5 rounded-[18px] border border-border bg-card px-[26px] py-[22px] shadow-[0_4px_14px_rgba(28,25,23,0.06)]">
      <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-success-bg">
        <svg width="26" height="24" viewBox="0 0 48 44" fill="none" aria-hidden>
          <path
            d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
            className="fill-success"
          />
        </svg>
        {/* ws-note carries the drift and is already gated on
            prefers-reduced-motion in globals.css. */}
        <span className="ws-note absolute -right-2 -top-1.5 text-sm text-success" aria-hidden>
          ♫
        </span>
      </div>
      <div className="flex-1">
        <div className="mb-1 type-heading text-xl">Nothing needs you right now.</div>
        <div className="text-sm text-muted-foreground">
          {liveSurveyCount === 0
            ? "No surveys are listening yet. Share a link and anyone who scores 7 or higher shows up here."
            : `${liveSurveyCount === 1 ? "One survey is" : `${liveSurveyCount} surveys are`} out listening. We’ll surface anyone who scores 7 or higher.`}
        </div>
      </div>
      <div className="shrink-0">{copyLinkAction}</div>
    </section>
  );
}

// --- Out listening ---------------------------------------------------------

export function OutListening({ surveys }: { surveys: ListeningSurvey[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-chip px-5 py-[14px]">
        <span className="type-label">Out listening</span>
        <SectionLink href="/admin/surveys">All surveys</SectionLink>
      </div>
      {surveys.map((survey) =>
        survey.isLive ? (
          <Link
            key={survey.id}
            href={`/admin/surveys/${survey.id}`}
            className="group grid grid-cols-[1fr_150px_92px] items-center gap-4 border-b border-chip px-5 py-[15px] transition-colors last:border-b-0 hover:bg-secondary"
          >
            <div className="flex min-w-0 items-center gap-[9px]">
              {/* Same live dot the sidebar's "Listening · N live" uses. */}
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#8fbf7a]" />
              <span className="truncate text-[13.5px] font-semibold text-card-foreground">
                {survey.title}
              </span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-[4px] bg-chip">
              <div
                className="h-full rounded-[4px] bg-success"
                style={{ width: `${Math.round((survey.completionRate ?? 0) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
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
            className="group flex items-center gap-[9px] border-b border-chip px-5 py-[13px] transition-colors last:border-b-0 hover:bg-secondary"
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-faint" />
            <span className="truncate text-[12.5px] font-semibold text-muted-foreground">
              {survey.title} · draft, never launched
            </span>
            <Chevron className="ml-auto text-faint" />
          </Link>
        )
      )}
    </div>
  );
}

// --- Industry report -------------------------------------------------------

// The one place this page steps outside the --ds-* set: butter has no admin
// token, and flattening the card to a neutral grey would lose the point of
// it (a different kind of thing from the lead cards). --lp-butter-* already
// holds these exact values for the marketing pages, so this borrows them
// rather than inventing a colour. Swap to bg-secondary/text-muted-foreground
// if admin should never reach across for a marketing token.
export function ReportCard({ report }: { report: ReportProgress }) {
  const remaining = REPORT_INTERVIEW_MINIMUM - report.completedCount;

  return (
    <div className="relative rounded-card border border-landing-butter-deep/25 bg-landing-butter-bg px-[22px] pb-[22px] pt-5">
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
            fill="var(--lp-butter-bg)"
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

      <div className="mb-[9px] type-label text-[11.5px] tracking-[0.11em] text-landing-butter-deep">
        Industry report
      </div>
      <div className="mb-2 max-w-[20ch] type-heading text-[19px] font-semibold leading-[1.25]">
        {report.ready
          ? "You have enough interviews to draft the report."
          : remaining === 1
            ? "One more interview and your report drafts itself."
            : `${remaining} more interviews and your report drafts itself.`}
      </div>
      <div className="mb-[14px] text-[13px] leading-[1.5] text-landing-butter-deep">
        Pain themes across everyone who answered, ready to send back to them.
      </div>
      <Link
        href={`/admin/surveys/${report.surveyId}`}
        className="text-[13px] font-bold text-landing-butter-deep transition-colors hover:underline"
      >
        {report.ready ? "Draft the report" : "Preview the draft"} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

// --- What's been happening -------------------------------------------------

const ACTIVITY_GRID = "grid grid-cols-[1.1fr_1.6fr_64px_76px_24px] items-center gap-4 px-5";

export function ActivityTable({ events }: { events: ActivityEvent[] }) {
  return (
    <section>
      <SectionHeader
        label="What’s been happening"
        action={<SectionLink href="/admin/leads">View all</SectionLink>}
      />
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <div
          className={cn(
            ACTIVITY_GRID,
            "border-b border-chip py-[11px] text-[11px] font-bold uppercase tracking-[0.09em] text-faint"
          )}
        >
          <div>Person</div>
          <div>Activity</div>
          <div>Score</div>
          <div className="text-right">When</div>
          <div />
        </div>
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/admin/responses/${event.id}`}
            className={cn(
              ACTIVITY_GRID,
              "group border-b border-chip py-[14px] transition-colors last:border-b-0 hover:bg-secondary"
            )}
          >
            <div className="flex min-w-0 items-center gap-[11px]">
              <Initials className="h-[30px] w-[30px] bg-chip text-[11.5px] text-muted-foreground">
                {event.initials}
              </Initials>
              <span className="truncate text-[13.5px] font-semibold text-card-foreground">
                {event.name}
              </span>
            </div>
            <div className="min-w-0 truncate text-[13px] text-muted-foreground">{event.what}</div>
            <div>
              <ScoreBadge score={event.score} />
            </div>
            <div className="text-right text-[12.5px] text-faint" suppressHydrationWarning>
              {formatRelativeTime(event.createdAt)}
            </div>
            <Chevron className="text-faint" />
          </Link>
        ))}
      </div>
    </section>
  );
}
