import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResponsesTable } from "./ResponsesTable";
import { SurveyUrl } from "./SurveyUrl";
import { SurveyStatusToggle } from "./SurveyStatusToggle";
import { SurveyForm, type SurveyFormValues } from "@/components/SurveyForm";
import {
  parseCustomRespondentFieldDefs,
  parseEnabledRespondentFields,
  parsePresetFieldLabel,
  parsePresetFieldRequired,
} from "@/lib/surveys/respondent-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Neither query depends on the other's result (responses is filtered by
  // the route param, not by anything read off the survey row), so they run
  // concurrently instead of the survey fetch blocking the responses fetch.
  const [{ data: survey }, { data: responses }] = await Promise.all([
    supabase.from("surveys").select("*").eq("id", id).maybeSingle(),
    supabase.from("responses").select("*").eq("survey_id", id).order("created_at", { ascending: false }),
  ]);

  if (!survey) {
    notFound();
  }

  const enabledFields = parseEnabledRespondentFields(survey.custom_fields);
  const customFieldDefs = parseCustomRespondentFieldDefs(survey.custom_fields);
  const initialValues: SurveyFormValues = {
    title: survey.title,
    externalTitle: survey.external_title ?? "",
    slug: survey.slug,
    sponsor: survey.sponsor ?? "",
    topic: survey.topic ?? "",
    targetIndustry: survey.target_industry ?? "",
    targetJobTitle: survey.target_job_title ?? "",
    targetCompanySize: survey.target_company_size ?? "",
    questionGuide: survey.question_guide ?? "",
    tone: survey.tone ?? "",
    numQuestions: survey.num_questions != null ? String(survey.num_questions) : "",
    giftCardAmount: survey.gift_card_amount != null ? String(survey.gift_card_amount) : "",
    collectPhone: enabledFields.includes("phone"),
    collectJobTitle: enabledFields.includes("job_title"),
    collectCompany: enabledFields.includes("company"),
    collectLinkedin: enabledFields.includes("linkedin"),
    phoneLabel: parsePresetFieldLabel(survey.custom_fields, "phone"),
    jobTitleLabel: parsePresetFieldLabel(survey.custom_fields, "job_title"),
    companyLabel: parsePresetFieldLabel(survey.custom_fields, "company"),
    linkedinLabel: parsePresetFieldLabel(survey.custom_fields, "linkedin"),
    phoneRequired: parsePresetFieldRequired(survey.custom_fields, "phone"),
    jobTitleRequired: parsePresetFieldRequired(survey.custom_fields, "job_title"),
    companyRequired: parsePresetFieldRequired(survey.custom_fields, "company"),
    linkedinRequired: parsePresetFieldRequired(survey.custom_fields, "linkedin"),
    customFields: customFieldDefs,
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-card-foreground">{survey.title}</h1>
          <SurveyStatusToggle surveyId={survey.id} status={survey.status} />
        </div>
        <p className="text-sm text-muted-foreground">{responses?.length ?? 0} responses</p>
        <SurveyUrl slug={survey.slug} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Survey details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SurveyForm mode="edit" surveyId={survey.id} initialValues={initialValues} />
        </CardContent>
      </Card>

      <ResponsesTable responses={responses ?? []} />
    </div>
  );
}
