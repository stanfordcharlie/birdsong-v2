import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { Button, PageHeader, PageShell, StatusDot } from "@/components/admin/ui";
import { ExportStudiesButton } from "./ExportStudiesButton";
import { SurveysList, type SurveyListItem } from "./SurveysList";

// How many slices each card's activity row divides a study's lifetime into.
const ACTIVITY_BARS = 32;

function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}

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
        .select("survey_id, created_at, completed, lead_score")
        .in("survey_id", surveyIds)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
    : {
        data: [] as { survey_id: string; created_at: string; completed: boolean; lead_score: number | null }[],
      };

  const rows = responseRows ?? [];
  const now = Date.now();

  const bySurvey = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySurvey.get(row.survey_id);
    if (list) list.push(row);
    else bySurvey.set(row.survey_id, [row]);
  }

  const items: SurveyListItem[] = (surveys ?? []).map((survey) => {
    const own = bySurvey.get(survey.id) ?? [];
    // Rows arrive newest-first, so the first one is the latest response.
    const lastResponseAt = own[0]?.created_at ?? null;

    // The activity row: the study's lifetime cut into equal slices, one
    // response tally per slice. Derived from the created_at values already
    // fetched for the counts, so it costs no extra query.
    const start = new Date(survey.created_at).getTime();
    const span = Math.max(1, now - start);
    const activity = new Array<number>(ACTIVITY_BARS).fill(0);
    for (const row of own) {
      const at = new Date(row.created_at).getTime();
      const slice = Math.min(ACTIVITY_BARS - 1, Math.max(0, Math.floor(((at - start) / span) * ACTIVITY_BARS)));
      activity[slice] += 1;
    }

    return {
      id: survey.id,
      title: survey.title,
      slug: survey.slug,
      status: survey.status,
      questionCount: survey.num_questions,
      responseCount: own.length,
      completedCount: own.filter((r) => r.completed).length,
      qualifiedCount: own.filter((r) => r.completed && (r.lead_score ?? 0) >= WORTH_A_CALL_SCORE_MIN).length,
      lastResponseAt,
      activity,
      createdAt: survey.created_at,
      archivedAt: survey.archived_at,
    };
  });

  // The header's one line of fact. Live and draft count only what is not
  // archived; the total is everything the account holds, like the All tab.
  const liveCount = items.filter((s) => s.archivedAt === null && s.status === "live").length;
  const draftCount = items.filter((s) => s.archivedAt === null && s.status !== "live").length;
  const newStudyHref = canCreateStudy ? "/admin/surveys/new" : null;

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        meta={
          items.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <span>{plural(items.length, "study", "studies")}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <StatusDot live />
                {liveCount} live
              </span>
              <span aria-hidden>·</span>
              <span>{plural(draftCount, "draft")}</span>
            </span>
          ) : undefined
        }
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
        <SurveysList
          surveys={items}
          initialStatusFilter={initialStatusFilter}
          canManage={canManageStudies}
          newStudyHref={newStudyHref}
        />
      )}
    </PageShell>
  );
}
