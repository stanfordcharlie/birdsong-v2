import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { excludeArchivedStudies } from "@/lib/lead-queue";
import { Button, PageHeader, PageShell } from "@/components/admin/ui";
import {
  ActivityTable,
  OutListening,
  ReportNote,
  REPORT_INTERVIEW_MINIMUM,
  WeekStatsStrip,
  type ActivityEvent,
  type ListeningSurvey,
  type ReportProgress,
  type WeekStats,
} from "./HomeSections";

// This file is the data layer and the page composition; HomeSections.tsx
// holds the markup.

// A lead is worth surfacing from 7 up, the same cutoff the Slack notification
// and the HubSpot deal threshold use, so "qualified" means one thing across
// the product.
const QUALIFIED_SCORE_MIN = 7;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// How many rows the activity feed pulls before filtering. It has to over-fetch
// because a response that was started and abandoned before the first question
// is not an event anyone wants to read about, so some rows get dropped.
const ACTIVITY_FETCH_LIMIT = 12;
const ACTIVITY_ROWS = 4;

type InterviewMessageish = { role?: unknown };

function displayName(name: string | null): string {
  return name?.trim() || "Anonymous";
}

// Which question they were on when they stopped: the interviewer asks, the
// respondent answers, so the count of assistant turns is the number of
// questions they actually saw.
function questionsAsked(messages: unknown): number {
  if (!Array.isArray(messages)) return 0;
  return (messages as InterviewMessageish[]).filter((m) => m?.role === "assistant").length;
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const { orgId, role } = await requireActiveOrg();
  const canCreateStudy = can(role, "study:create");

  // Four parallel queries, no waterfall between them.
  //
  // surveys and survey_reports carry an explicit org_id filter because both
  // tables have a public-read policy (surveys_public_read for the respondent
  // flow, survey_reports_public_read for the research library), so RLS alone
  // does not narrow them to this org. responses has no such policy: its
  // org-member read policy is the whole filter.
  const [{ data: surveysData }, { data: responsesData }, { data: activityData }, { data: reportRows }] =
    await Promise.all([
      supabase
        .from("surveys")
        .select("id, slug, title, status, created_at")
        .eq("org_id", orgId)
        // Archived surveys are excluded from every stat and list on this page,
        // matching the surveys list's default view.
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      // Responses on archived studies are excluded at the database (see
      // lib/lead-queue.ts), the same rule the lead queue applies, so the
      // counts here and there never disagree.
      excludeArchivedStudies(
        supabase
          .from("responses")
          .select(
            "id, survey_id, lead_score, status, completed, created_at, surveys!inner(archived_at)"
          )
          .eq("is_test", false)
      ).order("created_at", { ascending: false }),
      // Separate and hard-limited because it is the only query that needs
      // `messages`, a full transcript per row.
      excludeArchivedStudies(
        supabase
          .from("responses")
          .select(
            "id, survey_id, respondent_name, lead_score, completed, created_at, messages, surveys!inner(archived_at)"
          )
          .eq("is_test", false)
      )
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_FETCH_LIMIT),
      supabase.from("survey_reports").select("survey_id").eq("org_id", orgId),
    ]);

  const surveys = surveysData ?? [];
  const surveyIds = new Set(surveys.map((s) => s.id));
  const surveyTitleById = new Map(surveys.map((s) => [s.id, s.title]));

  // A response whose survey has since been archived still exists, but this
  // page has already dropped that survey, so drop its responses too.
  const responses = (responsesData ?? []).filter((r) => surveyIds.has(r.survey_id));
  const completed = responses.filter((r) => r.completed);

  // --- This week ----------------------------------------------------------

  // Only "completed this week" is windowed to the week. Average score is a
  // quality measure, and over a single quiet week it is either noise or an
  // empty cell; read across every response it is a stable number.
  const weekAgo = Date.now() - WEEK_MS;
  const completedThisWeek = completed.filter((r) => new Date(r.created_at).getTime() >= weekAgo);
  const scored = completed.filter((r) => typeof r.lead_score === "number");

  // "Awaiting contact" is a current-state count, not a seven-day one: a lead
  // that has been sitting untouched for nine days is exactly the one this
  // cell exists to surface.
  const waitingLeads = completed.filter(
    (r) => (r.lead_score ?? 0) >= QUALIFIED_SCORE_MIN && (r.status ?? "new") === "new"
  );

  const stats: WeekStats = {
    awaiting: waitingLeads.length,
    completedThisWeek: completedThisWeek.length,
    averageScore:
      scored.length > 0
        ? scored.reduce((sum, r) => sum + (r.lead_score ?? 0), 0) / scored.length
        : null,
  };

  // --- Studies ------------------------------------------------------------

  const startedBySurvey = new Map<string, number>();
  const completedBySurvey = new Map<string, number>();
  for (const r of responses) {
    startedBySurvey.set(r.survey_id, (startedBySurvey.get(r.survey_id) ?? 0) + 1);
    if (r.completed) {
      completedBySurvey.set(r.survey_id, (completedBySurvey.get(r.survey_id) ?? 0) + 1);
    }
  }

  const liveSurveys = surveys.filter((s) => s.status === "live");
  // Drafts that have never been answered, last. A draft someone has already
  // responded to is a live survey that got paused, not a never-launched one.
  const neverLaunched = surveys.filter(
    (s) => s.status !== "live" && (startedBySurvey.get(s.id) ?? 0) === 0
  );

  const listeningSurveys: ListeningSurvey[] = [...liveSurveys, ...neverLaunched].map((s) => ({
    id: s.id,
    title: s.title,
    isLive: s.status === "live",
    completedCount: completedBySurvey.get(s.id) ?? 0,
  }));

  // --- Industry report ----------------------------------------------------

  // Points at whichever survey is closest to having a report worth reading:
  // the one with the most completed interviews that has not been reported on
  // yet. Hidden entirely until at least one interview exists.
  const reportedSurveyIds = new Set((reportRows ?? []).map((r) => r.survey_id));
  const reportCandidate = surveys
    .filter((s) => !reportedSurveyIds.has(s.id) && (completedBySurvey.get(s.id) ?? 0) > 0)
    .sort((a, b) => (completedBySurvey.get(b.id) ?? 0) - (completedBySurvey.get(a.id) ?? 0))[0];

  const report: ReportProgress | null = reportCandidate
    ? {
        surveyId: reportCandidate.id,
        completedCount: completedBySurvey.get(reportCandidate.id) ?? 0,
        ready: (completedBySurvey.get(reportCandidate.id) ?? 0) >= REPORT_INTERVIEW_MINIMUM,
      }
    : null;

  // --- Recent activity ----------------------------------------------------

  const events: ActivityEvent[] = (activityData ?? [])
    .filter((r) => surveyIds.has(r.survey_id))
    // An interview abandoned before the first question was even asked is not
    // an event: nothing happened yet.
    .filter((r) => r.completed || questionsAsked(r.messages) > 0)
    .slice(0, ACTIVITY_ROWS)
    .map((r) => ({
      id: r.id,
      name: displayName(r.respondent_name),
      what: r.completed
        ? `Completed ${surveyTitleById.get(r.survey_id) ?? "a study"}`
        : `Dropped off at question ${questionsAsked(r.messages)}`,
      score: r.lead_score,
      createdAt: r.created_at,
    }));

  // --- Composition --------------------------------------------------------

  return (
    <PageShell>
      <PageHeader
        className="bs-rise-1"
        title="Home"
        actions={
          canCreateStudy ? (
            <Button asChild>
              <Link href="/admin/surveys/new">New study</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-10">
        <div className="bs-rise-2">
          <WeekStatsStrip stats={stats} />
        </div>

        {listeningSurveys.length > 0 && (
          <div className="bs-rise-3">
            <OutListening surveys={listeningSurveys} />
            {report && <ReportNote report={report} />}
          </div>
        )}

        {events.length > 0 && (
          <div className="bs-rise-4">
            <ActivityTable events={events} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
