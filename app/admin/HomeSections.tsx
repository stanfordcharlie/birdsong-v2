import Link from "next/link";
import {
  Button,
  DataTable,
  RelativeTime,
  ScoreBadge,
  StatRow,
  StatusDot,
  type Column,
} from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import { cn } from "@/lib/utils";

// The Home dashboard's presentational layer. Every value resolves through the
// admin token layer and the components/admin/ui primitives, so Home reads as
// the same product as Leads and Studies sitting next to it.

// The report generator needs three transcripts before it will run
// (app/api/surveys/[id]/report/route.ts).
export const REPORT_INTERVIEW_MINIMUM = 3;

export type ListeningSurvey = {
  id: string;
  title: string;
  isLive: boolean;
  completedCount: number;
};

export type ActivityEvent = {
  id: string;
  name: string;
  what: string;
  score: number | null;
  createdAt: string;
};

export type WeekStats = {
  awaiting: number;
  completedThisWeek: number;
  averageScore: number | null;
};

export type ReportProgress = {
  surveyId: string;
  completedCount: number;
  /** True once the survey has enough interviews for the generator to run. */
  ready: boolean;
};

// --- Small shared pieces ---------------------------------------------------

// A bare text link that navigates is a ghost Button, not an anchor styled at
// the call site.
function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="ghost" size="sm" className="ml-auto px-0">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="type-eyebrow">{label}</span>
      {action}
    </div>
  );
}

// --- This week -------------------------------------------------------------

// Three stats, not four: "Completion rate" was the same fact as "Completed
// this week" read a second way, and the count is the one that drives action.
export function WeekStatsStrip({ stats }: { stats: WeekStats }) {
  return (
    <StatRow
      stats={[
        // The only cell that navigates: the other two are readouts with
        // nowhere more specific to go than the page you are already on.
        { label: "Awaiting contact", value: stats.awaiting, href: "/admin/leads?status=new" },
        { label: "Completed this week", value: stats.completedThisWeek },
        {
          label: "Average score",
          value: stats.averageScore === null ? EMPTY_VALUE : stats.averageScore.toFixed(1),
        },
      ]}
    />
  );
}

// --- Out listening ---------------------------------------------------------

const LISTENING_COLUMNS: Column<ListeningSurvey>[] = [
  {
    key: "title",
    header: "Study",
    truncate: true,
    title: (survey) => survey.title,
    cell: (survey) => (
      <span className="inline-flex max-w-full items-center gap-2">
        <StatusDot live={survey.isLive} />
        <span className={cn("truncate font-medium", !survey.isLive && "text-muted-foreground")}>
          {survey.title}
        </span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "sm",
    cell: (survey) => (
      <span className="text-muted-foreground">{survey.isLive ? "Live" : "Draft"}</span>
    ),
  },
  {
    key: "completed",
    header: "Completed",
    align: "right",
    width: "sm",
    cell: (survey) => (survey.isLive ? survey.completedCount : EMPTY_VALUE),
  },
];

export function OutListening({ surveys }: { surveys: ListeningSurvey[] }) {
  return (
    <section>
      <SectionHeader label="Studies" action={<SectionLink href="/admin/surveys">All studies</SectionLink>} />
      <DataTable
        columns={LISTENING_COLUMNS}
        rows={surveys}
        rowKey={(survey) => survey.id}
        rowHref={(survey) => `/admin/surveys/${survey.id}`}
        density="compact"
        empty={{ title: "No studies yet." }}
      />
    </section>
  );
}

// --- Industry report -------------------------------------------------------

// One line of fact and one link. The sticker card this replaces spent a full
// tinted card on the same number.
export function ReportNote({ report }: { report: ReportProgress }) {
  return (
    <p className="type-body-sm mt-3 flex flex-wrap items-center gap-x-3 text-muted-foreground">
      <span className="tabular-nums">
        {report.ready
          ? "Enough interviews for a report draft"
          : `${Math.min(report.completedCount, REPORT_INTERVIEW_MINIMUM)} of ${REPORT_INTERVIEW_MINIMUM} interviews toward a report draft`}
      </span>
      <Link
        href={`/admin/surveys/${report.surveyId}`}
        className="focus-ring rounded-control text-card-foreground underline underline-offset-2"
      >
        {report.ready ? "Draft report" : "Open study"}
      </Link>
    </p>
  );
}

// --- Recent activity -------------------------------------------------------

const ACTIVITY_COLUMNS: Column<ActivityEvent>[] = [
  {
    key: "person",
    header: "Person",
    width: 0.3,
    truncate: true,
    title: (event) => event.name,
    cell: (event) => <span className="font-medium">{event.name}</span>,
  },
  {
    key: "what",
    header: "Activity",
    width: 0.45,
    truncate: true,
    title: (event) => event.what,
    cell: (event) => <span className="text-muted-foreground">{event.what}</span>,
  },
  { key: "score", header: "Score", align: "center", width: "xs", cell: (event) => <ScoreBadge score={event.score} /> },
  {
    key: "when",
    header: "When",
    align: "right",
    width: "sm",
    cell: (event) => <RelativeTime date={event.createdAt} align="right" className="text-muted-foreground" />,
  },
];

export function ActivityTable({ events }: { events: ActivityEvent[] }) {
  return (
    <section>
      <SectionHeader label="Recent activity" action={<SectionLink href="/admin/leads">All leads</SectionLink>} />
      <DataTable
        columns={ACTIVITY_COLUMNS}
        rows={events}
        rowKey={(event) => event.id}
        rowHref={(event) => `/admin/responses/${event.id}`}
        density="compact"
        layout="fixed"
        empty={{ title: "No activity yet." }}
      />
    </section>
  );
}
