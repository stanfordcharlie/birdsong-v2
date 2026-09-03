import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { Button, PageHeader, PageShell } from "@/components/admin/ui";
import { SurveysList, type SurveyListItem } from "./SurveysList";
import { SurveyStats, type SurveyStatsData } from "./SurveyStats";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { orgId, role } = await requireActiveOrg();
  const canCreateStudy = can(role, "study:create");
  const canManageStudies = can(role, "study:edit") && can(role, "study:delete");
  const { status } = await searchParams;
  const initialStatusFilter =
    status === "live" ? "live" : status === "draft" ? "draft" : status === "archived" ? "archived" : "all";

  // surveys_public_read (RLS) intentionally allows anyone to read any
  // survey, since the unauthenticated respondent flow needs to look one up
  // by slug. That means an unfiltered select here would return every
  // organization's surveys, not just this one's, so the org has to be
  // filtered explicitly rather than left to RLS.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, slug, status, num_questions, created_at, archived_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const surveyIds = surveys?.map((survey) => survey.id) ?? [];
  // No response-count aggregation exists server-side (no RPC in place), so
  // this pulls one row per response across this admin's surveys in a single
  // query and tallies it here.
  const { data: responseRows } = surveyIds.length
    ? await supabase
        .from("responses")
        .select("survey_id, created_at, completed")
        .in("survey_id", surveyIds)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
    : { data: [] as { survey_id: string; created_at: string; completed: boolean }[] };

  const rows = responseRows ?? [];
  const now = Date.now();

  const counts = new Map<string, number>();
  const lastAt = new Map<string, string>();

  for (const row of rows) {
    counts.set(row.survey_id, (counts.get(row.survey_id) ?? 0) + 1);
    // Rows arrive newest-first, so the first sighting of a survey is its
    // most recent response.
    if (!lastAt.has(row.survey_id)) lastAt.set(row.survey_id, row.created_at);
  }

  const items: SurveyListItem[] = (surveys ?? []).map((survey) => ({
    id: survey.id,
    title: survey.title,
    slug: survey.slug,
    status: survey.status,
    questionCount: survey.num_questions,
    responseCount: counts.get(survey.id) ?? 0,
    lastResponseAt: lastAt.get(survey.id) ?? null,
    createdAt: survey.created_at,
    archivedAt: survey.archived_at,
  }));

  // --- Stats --------------------------------------------------------------

  const weekAgo = now - WEEK_DAYS * DAY_MS;
  const priorWeekAgo = now - 2 * WEEK_DAYS * DAY_MS;
  let thisWeek = 0;
  let priorWeek = 0;
  for (const row of rows) {
    const at = new Date(row.created_at).getTime();
    if (at >= weekAgo) thisWeek += 1;
    else if (at >= priorWeekAgo) priorWeek += 1;
  }

  const completed = rows.filter((r) => r.completed).length;

  const stats: SurveyStatsData = {
    responsesThisWeek: thisWeek,
    // Null rather than a fabricated 0% or +100% when there is no prior week
    // to compare against: a delta needs both halves to mean anything.
    weekDelta: priorWeek > 0 ? (thisWeek - priorWeek) / priorWeek : null,
    responsesTotal: rows.length,
    completionRate: rows.length > 0 ? completed / rows.length : null,
  };

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        actions={
          canCreateStudy ? (
            <Button asChild>
              <Link href="/admin/surveys/new">New study</Link>
            </Button>
          ) : undefined
        }
      />

      {error && <p className="type-body text-destructive">{error.message}</p>}

      {!error && (
        <div className="flex flex-col gap-8">
          {items.length > 0 && <SurveyStats stats={stats} />}
          <SurveysList
            surveys={items}
            initialStatusFilter={initialStatusFilter}
            canManage={canManageStudies}
          />
        </div>
      )}
    </PageShell>
  );
}
