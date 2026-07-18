import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SurveysList, type SurveyListItem } from "./SurveysList";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // surveys_public_read (RLS) intentionally allows anyone to read any
  // survey, since the unauthenticated respondent flow needs to look one up
  // by slug. That means an unfiltered select here would return every
  // admin's surveys, not just the current one's, so ownership has to be
  // filtered explicitly rather than left to RLS.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const surveyIds = surveys?.map((survey) => survey.id) ?? [];
  // No response-count aggregation exists server-side (no RPC in place), so
  // this pulls the bare survey_id column for every response across this
  // admin's surveys in one query and tallies it client-side here — the
  // same unaggregated approach the survey detail page already uses for its
  // own single-survey response count.
  const { data: responseRows } = surveyIds.length
    ? await supabase
        .from("responses")
        .select("survey_id")
        .in("survey_id", surveyIds)
        .eq("is_test", false)
    : { data: [] as { survey_id: string }[] };

  const responseCounts = new Map<string, number>();
  for (const row of responseRows ?? []) {
    responseCounts.set(row.survey_id, (responseCounts.get(row.survey_id) ?? 0) + 1);
  }

  const items: SurveyListItem[] = (surveys ?? []).map((survey) => ({
    id: survey.id,
    title: survey.title,
    slug: survey.slug,
    status: survey.status,
    responseCount: responseCounts.get(survey.id) ?? 0,
    createdAt: survey.created_at,
  }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Surveys</span>
          <h1 className="font-serif text-[40px] font-normal leading-none tracking-[-0.01em] text-card-foreground">
            Your surveys
          </h1>
        </div>
        <Button asChild>
          <Link href="/admin/surveys/new">New survey</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!error && <SurveysList surveys={items} />}
    </div>
  );
}
