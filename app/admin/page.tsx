import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { userFirstName } from "@/lib/user-name";
import { Button, PageShell } from "@/components/admin/ui";
import { GreetingBlock } from "./GreetingBlock";
import { CopySurveyLinkButton } from "./CopySurveyLinkButton";
import {
  ActivityTable,
  OutListening,
  PriorityLeads,
  QuietState,
  ReportCard,
  REPORT_INTERVIEW_MINIMUM,
  WeekStatsStrip,
  type ActivityEvent,
  type ListeningSurvey,
  type PriorityLead,
  type ReportProgress,
  type WeekStats,
} from "./HomeSections";

// Design reference: design_handoff_admin_home/AdminHome.dc.html. This file is
// the data layer and the page composition; HomeSections.tsx holds the markup
// and documents how the handoff's palette maps onto the shipped admin tokens.

// A lead is worth surfacing from 7 up — the same cutoff the Slack notification
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

function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function displayName(name: string | null): string {
  return name?.trim() || "Anonymous";
}

function stringField(values: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

// Which question they were on when they stopped: the interviewer asks, the
// respondent answers, so the count of assistant turns is the number of
// questions they actually saw.
function questionsAsked(messages: unknown): number {
  if (!Array.isArray(messages)) return 0;
  return (messages as InterviewMessageish[]).filter((m) => m?.role === "assistant").length;
}

// The subline states what is actually waiting, in the handoff's register:
// plain, warm, no exclamation.
function buildSubline(waiting: number, liveSurveyCount: number, everCompleted: number): string {
  if (waiting === 1) return "One lead finished an interview and hasn’t heard back yet.";
  if (waiting > 1) return `${waiting} leads finished interviews and none of them have heard back yet.`;
  if (liveSurveyCount > 0) {
    return liveSurveyCount === 1
      ? "One survey is listening. Nothing is waiting on you right now."
      : `${liveSurveyCount} surveys are listening. Nothing is waiting on you right now.`;
  }
  if (everCompleted > 0) return "Nothing is listening at the moment. Set a survey live to start again.";
  return "Create your first survey and Wren starts interviewing the moment you share the link.";
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  // Five parallel queries, no waterfall between them.
  //
  // The responses query deliberately drops the `completed` filter the old
  // page had: completion rate needs the interviews that were started and
  // abandoned too, so the filtering happens in JS below where both halves
  // are available.
  const [
    { data: profile },
    { data: surveysData },
    { data: responsesData },
    { data: activityData },
    { data: reportRows },
  ] = await Promise.all([
    supabase.from("profiles").select("contact_name").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("surveys")
      .select("id, slug, title, status, created_at")
      .eq("user_id", user.id)
      // Archived surveys are excluded from every stat and list on this page,
      // matching the surveys list's default view.
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("responses")
      .select(
        "id, survey_id, respondent_name, custom_field_values, lead_score, status, pain_points, completed, created_at"
      )
      .eq("user_id", user.id)
      .eq("is_test", false)
      .order("created_at", { ascending: false }),
    // Separate and hard-limited because it is the only query that needs
    // `messages`, a full transcript per row — fetching that column across
    // every response just to label four activity rows would dwarf the rest
    // of this page's payload.
    supabase
      .from("responses")
      .select("id, survey_id, respondent_name, lead_score, completed, created_at, messages")
      .eq("user_id", user.id)
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_FETCH_LIMIT),
    supabase.from("survey_reports").select("survey_id").eq("user_id", user.id),
  ]);

  // Company fit lives in its own columns and is fetched separately for the
  // same reason the leads queue does it: if the response_company_fit
  // migration has not been applied to this database, this one query errors
  // and every lead simply renders without a fit score, rather than the whole
  // page failing.
  const { data: fitRows } = await supabase
    .from("responses")
    .select("id, fit_score")
    .eq("user_id", user.id)
    .eq("completed", true);
  const fitById = new Map((fitRows ?? []).map((r) => [r.id, r.fit_score]));

  const firstName = userFirstName(user, profile?.contact_name);
  const surveys = surveysData ?? [];
  const surveyIds = new Set(surveys.map((s) => s.id));
  const surveyTitleById = new Map(surveys.map((s) => [s.id, s.title]));

  // A response whose survey has since been archived still exists, but this
  // page has already dropped that survey — so drop its responses too, and
  // every stat, count and list stays consistent with what is on screen.
  const responses = (responsesData ?? []).filter((r) => surveyIds.has(r.survey_id));
  const completed = responses.filter((r) => r.completed);

  // --- This week ----------------------------------------------------------

  // Only "interviews completed" is windowed to the week. Completion rate and
  // average score are quality measures, and over a single quiet week they are
  // either noise or an em dash — read across every response they are a stable
  // number that is actually worth putting on the page.
  const weekAgo = Date.now() - WEEK_MS;
  const completedThisWeek = completed.filter((r) => new Date(r.created_at).getTime() >= weekAgo);
  const scored = completed.filter((r) => typeof r.lead_score === "number");

  // "Awaiting first contact" is a current-state count, not a seven-day one:
  // a lead that has been sitting untouched for nine days is exactly the one
  // this cell exists to nag about.
  const waitingLeads = completed.filter(
    (r) => (r.lead_score ?? 0) >= QUALIFIED_SCORE_MIN && (r.status ?? "new") === "new"
  );

  const stats: WeekStats = {
    awaiting: waitingLeads.length,
    completedThisWeek: completedThisWeek.length,
    completionRate: responses.length > 0 ? completed.length / responses.length : null,
    averageScore:
      scored.length > 0
        ? scored.reduce((sum, r) => sum + (r.lead_score ?? 0), 0) / scored.length
        : null,
  };

  // --- Worth a call today -------------------------------------------------

  // waitingLeads already arrives newest-first from the query; sorting by score
  // on top of that makes the tie-break "most recent of the equally hot ones".
  const priorityLeads: PriorityLead[] = [...waitingLeads]
    .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
    .slice(0, 2)
    .map((r) => {
      const customValues = (r.custom_field_values as Record<string, unknown> | null) ?? {};
      const painPoints = (r.pain_points as unknown as string[] | null) ?? [];
      return {
        id: r.id,
        name: displayName(r.respondent_name),
        initials: initialsOf(r.respondent_name),
        role: stringField(customValues, "job_title", "role", "title"),
        company: stringField(customValues, "company", "derived_company_name"),
        score: r.lead_score ?? 0,
        fitScore: fitById.get(r.id) ?? null,
        // Their own words, verbatim — the top pain point is the same one the
        // Slack notification and the HubSpot contact quote.
        quote: typeof painPoints[0] === "string" ? painPoints[0] : null,
        createdAt: r.created_at,
      };
    });

  // --- Out listening ------------------------------------------------------

  const startedBySurvey = new Map<string, number>();
  const completedBySurvey = new Map<string, number>();
  for (const r of responses) {
    startedBySurvey.set(r.survey_id, (startedBySurvey.get(r.survey_id) ?? 0) + 1);
    if (r.completed) {
      completedBySurvey.set(r.survey_id, (completedBySurvey.get(r.survey_id) ?? 0) + 1);
    }
  }

  const liveSurveys = surveys.filter((s) => s.status === "live");
  // Drafts that have never been answered, last and muted — a draft someone
  // has already responded to is a live survey that got paused, not the
  // "never launched" row the handoff describes.
  const neverLaunched = surveys.filter(
    (s) => s.status !== "live" && (startedBySurvey.get(s.id) ?? 0) === 0
  );

  const listeningSurveys: ListeningSurvey[] = [...liveSurveys, ...neverLaunched].map((s) => {
    const started = startedBySurvey.get(s.id) ?? 0;
    const done = completedBySurvey.get(s.id) ?? 0;
    return {
      id: s.id,
      title: s.title,
      isLive: s.status === "live",
      completedCount: done,
      completionRate: started > 0 ? done / started : null,
    };
  });

  // --- Industry report ----------------------------------------------------

  // Points at whichever survey is closest to having a report worth reading:
  // the one with the most completed interviews that has not been reported on
  // yet. Hidden entirely until at least one interview exists, so it never
  // shows up as an empty promise on a brand-new account.
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

  // --- What's been happening ----------------------------------------------

  const events: ActivityEvent[] = (activityData ?? [])
    .filter((r) => surveyIds.has(r.survey_id))
    // An interview abandoned before the first question was even asked is not
    // an event — nothing happened yet.
    .filter((r) => r.completed || questionsAsked(r.messages) > 0)
    .slice(0, ACTIVITY_ROWS)
    .map((r) => ({
      id: r.id,
      name: displayName(r.respondent_name),
      initials: initialsOf(r.respondent_name),
      what: r.completed
        ? `Completed ${surveyTitleById.get(r.survey_id) ?? "a survey"}`
        : `Dropped off at question ${questionsAsked(r.messages)}`,
      score: r.lead_score,
      createdAt: r.created_at,
    }));

  // --- Composition --------------------------------------------------------

  const firstLiveSurvey = liveSurveys[0];
  const subline = buildSubline(waitingLeads.length, liveSurveys.length, completed.length);

  return (
    <PageShell>
      {/* GreetingBlock owns the masthead because the eyebrow and the headline
          both depend on the browser's clock, not the server's. It renders the
          shared PageHeader, so Home's header cannot drift from any other. */}
      <GreetingBlock
        firstName={firstName}
        subtitle={subline}
        actions={
          <>
            {firstLiveSurvey && (
              <CopySurveyLinkButton
                slug={firstLiveSurvey.slug}
                title={firstLiveSurvey.title}
                variant="text"
              />
            )}
            <Button asChild>
              <Link href="/admin/surveys/new">New survey</Link>
            </Button>
          </>
        }
      />

      <div className="bs-rise-2 mb-10">
        <WeekStatsStrip stats={stats} />
      </div>

      {/* Worth a call today, or the quiet state in its place */}
      <div className="bs-rise-3">
        {priorityLeads.length > 0 ? (
          <PriorityLeads leads={priorityLeads} waiting={waitingLeads.length} />
        ) : (
          <QuietState
            liveSurveyCount={liveSurveys.length}
            copyLinkAction={
              firstLiveSurvey ? (
                <CopySurveyLinkButton
                  slug={firstLiveSurvey.slug}
                  title={firstLiveSurvey.title}
                  variant="button"
                  label="Share a survey link"
                />
              ) : (
                <Button asChild variant="secondary">
                  <Link href="/admin/surveys/new">Create a survey</Link>
                </Button>
              )
            }
          />
        )}
      </div>

      {/* Out listening + the report card. The report card is hidden until at
          least one interview exists, so the left card takes the full width on
          a new account rather than leaving a 340px hole. */}
      {listeningSurveys.length > 0 && (
        <div
          className={
            report
              ? "bs-rise-4 mb-10 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]"
              : "bs-rise-4 mb-10"
          }
        >
          <OutListening surveys={listeningSurveys} />
          {report && <ReportCard report={report} />}
        </div>
      )}

      {events.length > 0 && (
        <div className="bs-rise-5">
          <ActivityTable events={events} />
        </div>
      )}
    </PageShell>
  );
}
