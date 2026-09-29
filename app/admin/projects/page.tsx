import Link from "next/link";
import { interviewLengthPreset, interviewLengthSummary } from "@/lib/studies/interview-length";
import { createClient } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { Button, PageShell, PageTopBar } from "@/components/admin/ui";
import { ExportStudiesButton } from "./ExportStudiesButton";
import { StudiesList, type StudyListItem } from "./StudiesList";

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
    .select("id, title, slug, status, interview_length, created_at, archived_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const surveyIds = surveys?.map((survey) => survey.id) ?? [];
  // No response-count aggregation exists server-side (no RPC in place), so
  // this pulls one row per response across this admin's surveys in a single
  // query and tallies it here.
  const { data: responseRows } = surveyIds.length
    ? await supabase
        .from("responses")
        .select("survey_id, created_at, completed, lead_score")
        .in("survey_id", surveyIds)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
    : {
        data: [] as { survey_id: string; created_at: string; completed: boolean; lead_score: number | null }[],
      };

  const rows = responseRows ?? [];

  // Each study's roster, for the card's progress bar and its pending count.
  // Status only: nothing else about a prospect is drawn here.
  const { data: prospectRows } = surveyIds.length
    ? await supabase.from("prospects").select("survey_id, status").in("survey_id", surveyIds)
    : { data: [] as { survey_id: string | null; status: string }[] };

  const prospectsBySurvey = new Map<string, { total: number; started: number; completed: number; pending: number }>();
  for (const row of prospectRows ?? []) {
    if (!row.survey_id) continue;
    const tally = prospectsBySurvey.get(row.survey_id) ?? { total: 0, started: 0, completed: 0, pending: 0 };
    tally.total += 1;
    if (row.status === "started") tally.started += 1;
    else if (row.status === "completed") tally.completed += 1;
    else if (row.status === "pending") tally.pending += 1;
    prospectsBySurvey.set(row.survey_id, tally);
  }

  const bySurvey = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySurvey.get(row.survey_id);
    if (list) list.push(row);
    else bySurvey.set(row.survey_id, [row]);
  }

  const items: StudyListItem[] = (surveys ?? []).map((survey) => {
    const own = bySurvey.get(survey.id) ?? [];
    // Rows arrive newest-first, so the first one is the latest response.
    const lastResponseAt = own[0]?.created_at ?? null;

    const roster = prospectsBySurvey.get(survey.id);

    return {
      id: survey.id,
      title: survey.title,
      slug: survey.slug,
      status: survey.status,
      lengthSummary: interviewLengthSummary(interviewLengthPreset(survey.interview_length)),
      responseCount: own.length,
      completedCount: own.filter((r) => r.completed).length,
      qualifiedCount: own.filter((r) => r.completed && (r.lead_score ?? 0) >= WORTH_A_CALL_SCORE_MIN).length,
      lastResponseAt,
      prospectCount: roster?.total ?? 0,
      prospectsStarted: roster?.started ?? 0,
      prospectsCompleted: roster?.completed ?? 0,
      prospectsPending: roster?.pending ?? 0,
      createdAt: survey.created_at,
      archivedAt: survey.archived_at,
    };
  });

  const newStudyHref = canCreateStudy ? "/admin/projects/new" : null;

  return (
    <PageShell>
      <PageTopBar
        crumbs={[{ label: "Projects" }]}
        actions={
          <>
            <ExportStudiesButton surveys={items} />
            {newStudyHref && (
              <Button asChild>
                <Link href={newStudyHref}>New study</Link>
              </Button>
            )}
          </>
        }
      />

      {error && <p className="type-body text-destructive">{error.message}</p>}

      {!error && (
        <StudiesList
          surveys={items}
          initialStatusFilter={initialStatusFilter}
          canManage={canManageStudies}
          newStudyHref={newStudyHref}
        />
      )}
    </PageShell>
  );
}
