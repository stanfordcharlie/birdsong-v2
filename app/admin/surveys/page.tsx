import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Badge, Button, PageHeader, PageShell, StatusDot } from "@/components/admin/ui";
import { SurveysList, type SurveyListItem } from "./SurveysList";
import { SurveyStats, type SurveyStatsData } from "./SurveyStats";

const DAY_MS = 24 * 60 * 60 * 1000;
const SPARK_DAYS = 7;
// How many respondent faces a card shows before it stops counting.
const CARD_AVATARS = 4;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { status } = await searchParams;
  const initialStatusFilter =
    status === "live" ? "live" : status === "draft" ? "draft" : status === "archived" ? "archived" : "all";

  // surveys_public_read (RLS) intentionally allows anyone to read any
  // survey, since the unauthenticated respondent flow needs to look one up
  // by slug. That means an unfiltered select here would return every
  // admin's surveys, not just the current one's, so ownership has to be
  // filtered explicitly rather than left to RLS.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, slug, status, num_questions, created_at, archived_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const surveyIds = surveys?.map((survey) => survey.id) ?? [];
  // No response-count aggregation exists server-side (no RPC in place), so
  // this pulls one row per response across this admin's surveys in a single
  // query and tallies it here. The column list is wider than the bare
  // survey_id it used to be — the cards carry a seven-day sparkline, a
  // "last answered" stamp and respondent initials, and the stat strip needs
  // completion — but it is the same number of rows, not more.
  const { data: responseRows } = surveyIds.length
    ? await supabase
        .from("responses")
        .select("survey_id, created_at, completed, respondent_name")
        .in("survey_id", surveyIds)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
    : { data: [] as { survey_id: string; created_at: string; completed: boolean; respondent_name: string | null }[] };

  const rows = responseRows ?? [];
  const now = Date.now();
  // Midnight-aligned so "this week" means seven calendar days, not a
  // rolling window that shifts every time the page is loaded.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dayIndexOf = (iso: string) =>
    Math.floor((todayStart.getTime() - new Date(iso).setHours(0, 0, 0, 0)) / DAY_MS);

  const counts = new Map<string, number>();
  const byDay = new Map<string, number[]>();
  const lastAt = new Map<string, string>();
  const names = new Map<string, string[]>();

  for (const row of rows) {
    counts.set(row.survey_id, (counts.get(row.survey_id) ?? 0) + 1);

    let days = byDay.get(row.survey_id);
    if (!days) {
      days = new Array(SPARK_DAYS).fill(0);
      byDay.set(row.survey_id, days);
    }
    const day = dayIndexOf(row.created_at);
    if (day >= 0 && day < SPARK_DAYS) days[SPARK_DAYS - 1 - day] += 1;

    // Rows arrive newest-first, so the first sighting of a survey is its
    // most recent response and the first N names are the latest answerers.
    if (!lastAt.has(row.survey_id)) lastAt.set(row.survey_id, row.created_at);
    const seen = names.get(row.survey_id) ?? [];
    if (seen.length < CARD_AVATARS && row.respondent_name?.trim()) {
      seen.push(row.respondent_name);
      names.set(row.survey_id, seen);
    }
  }

  const items: SurveyListItem[] = (surveys ?? []).map((survey) => ({
    id: survey.id,
    title: survey.title,
    slug: survey.slug,
    status: survey.status,
    questionCount: survey.num_questions,
    responseCount: counts.get(survey.id) ?? 0,
    responsesByDay: byDay.get(survey.id) ?? new Array(SPARK_DAYS).fill(0),
    lastResponseAt: lastAt.get(survey.id) ?? null,
    recentRespondents: names.get(survey.id) ?? [],
    createdAt: survey.created_at,
    archivedAt: survey.archived_at,
  }));

  // --- Masthead numbers ---------------------------------------------------

  const liveCount = items.filter((s) => s.archivedAt === null && s.status === "live").length;
  const draftCount = items.filter((s) => s.archivedAt === null && s.status !== "live").length;

  const weekAgo = now - SPARK_DAYS * DAY_MS;
  const priorWeekAgo = now - 2 * SPARK_DAYS * DAY_MS;
  let thisWeek = 0;
  let priorWeek = 0;
  const weekByDay = new Array(SPARK_DAYS).fill(0);
  for (const row of rows) {
    const at = new Date(row.created_at).getTime();
    if (at >= weekAgo) {
      thisWeek += 1;
      const day = dayIndexOf(row.created_at);
      if (day >= 0 && day < SPARK_DAYS) weekByDay[SPARK_DAYS - 1 - day] += 1;
    } else if (at >= priorWeekAgo) {
      priorWeek += 1;
    }
  }

  const completed = rows.filter((r) => r.completed).length;

  // The survey with the most completed interviews behind it, ignoring
  // archived ones — "best performer" should be something still worth
  // pointing at.
  const best = items
    .filter((s) => s.archivedAt === null && s.responseCount > 0)
    .sort((a, b) => b.responseCount - a.responseCount)[0];

  const stats: SurveyStatsData = {
    responsesThisWeek: thisWeek,
    // Null rather than a fabricated 0% or +100% when there is no prior week
    // to compare against — a delta needs both halves to mean anything.
    weekDelta: priorWeek > 0 ? (thisWeek - priorWeek) / priorWeek : null,
    responsesByDay: weekByDay,
    completionRate: rows.length > 0 ? completed / rows.length : null,
    bestPerformer: best ? { id: best.id, title: best.title, responseCount: best.responseCount } : null,
  };

  const subline =
    liveCount === 0 && draftCount === 0
      ? "Nothing here yet. Your first survey starts interviewing the moment you share its link."
      : [
          liveCount > 0 ? `${liveCount} survey${liveCount === 1 ? "" : "s"} collecting` : null,
          draftCount > 0 ? `${draftCount} draft${draftCount === 1 ? "" : "s"} waiting on you` : null,
        ]
          .filter(Boolean)
          .join(", ") + ".";

  return (
    <PageShell>
      {/* The eyebrow is a section name, matching the sidebar nav item, like
          every other page. The live count that used to live here as a status
          readout ("3 LIVE RIGHT NOW") is now a Badge beside the H1, which is
          the count treatment Leads already used. */}
      <PageHeader
        eyebrow="Surveys"
        title="Your surveys"
        badge={
          liveCount > 0 ? (
            <Badge variant="accent" className="gap-1.5">
              <StatusDot live />
              {liveCount} live
            </Badge>
          ) : null
        }
        subtitle={subline}
        actions={
          <Button asChild>
            <Link href="/admin/surveys/new">New survey</Link>
          </Button>
        }
      />

      {error && <p className="type-body text-destructive">{error.message}</p>}

      {!error && (
        <>
          {items.length > 0 && (
            <div className="mb-10">
              <SurveyStats stats={stats} />
            </div>
          )}
          <SurveysList surveys={items} initialStatusFilter={initialStatusFilter} />
        </>
      )}
    </PageShell>
  );
}
