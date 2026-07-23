import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeadsQueue, type LeadItem } from "./LeadsQueue";

export default async function LeadsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Cookie-authenticated client: responses_owner_all (RLS) already scopes
  // rows to the signed-in owner. The explicit user_id filter on top matches
  // the surveys page idiom — belt and suspenders, and self-documenting.
  const { data: responses, error } = await supabase
    .from("responses")
    .select(
      "id, respondent_name, respondent_email, custom_field_values, lead_score, status, pain_points, created_at, survey_id, is_test, source, surveys(title)"
    )
    .eq("user_id", user?.id ?? "")
    .eq("completed", true)
    .order("lead_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  // Company fit lives in its own columns (lib/interview/company-fit.ts) and is
  // fetched separately so this page keeps working before the
  // response_company_fit migration is applied: if those columns don't exist
  // yet, this query simply errors and every lead falls back to no-fit, rather
  // than breaking the whole queue. Merged by id below.
  const { data: fitRows } = await supabase
    .from("responses")
    .select("id, fit_score, fit_confidence, fit_reasoning")
    .eq("user_id", user?.id ?? "")
    .eq("completed", true);
  const fitById = new Map(
    (fitRows ?? []).map((r) => [r.id, { score: r.fit_score, confidence: r.fit_confidence, reasoning: r.fit_reasoning }])
  );

  const items: LeadItem[] = (responses ?? []).map((r) => {
    const customValues = (r.custom_field_values as Record<string, unknown> | null) ?? {};
    const painPoints = (r.pain_points as unknown as string[] | null) ?? [];
    const fit = fitById.get(r.id);
    return {
      id: r.id,
      name: r.respondent_name,
      email: r.respondent_email,
      company:
        typeof customValues.company === "string"
          ? customValues.company
          : typeof customValues.derived_company_name === "string"
            ? customValues.derived_company_name
            : null,
      surveyId: r.survey_id,
      surveyTitle: r.surveys?.title ?? "—",
      leadScore: r.lead_score,
      fitScore: fit?.score ?? null,
      fitConfidence: typeof fit?.confidence === "string" ? fit.confidence : null,
      fitReasoning: typeof fit?.reasoning === "string" ? fit.reasoning : null,
      status: r.status ?? "new",
      topPainPoint: typeof painPoints[0] === "string" ? painPoints[0] : null,
      createdAt: r.created_at,
      isTest: r.is_test,
      source: r.source,
    };
  });

  return (
    <div className="admin-container-wide flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <span className="type-label">Leads</span>
        <h1 className="type-page-title">Your lead queue</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!error &&
        (items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-8">
              <p className="text-sm text-card-foreground">
                No completed interviews yet. As respondents finish interviews, every lead across all
                your surveys lands here, hottest first.
              </p>
              <Button asChild>
                <Link href="/admin/surveys/new">Create a survey</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <LeadsQueue items={items} />
        ))}
    </div>
  );
}
