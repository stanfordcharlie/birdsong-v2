import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResponsesTable } from "./ResponsesTable";
import { SurveyDetailView, type RespondentChip } from "./SurveyDetailView";
import { type SurveyFormValues } from "@/components/SurveyForm";
import {
  parseCustomRespondentFieldDefs,
  parseEnabledRespondentFields,
  parsePresetFieldLabel,
  parsePresetFieldRequired,
} from "@/lib/surveys/respondent-fields";

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

  // Presets in enabledFields order, then any fully custom fields — mirrors
  // the order SurveyForm lists them in, so the read view's chip order
  // matches what "Edit" reveals right below it.
  const respondentChips: RespondentChip[] = [
    ...enabledFields.map((key) => ({
      label: parsePresetFieldLabel(survey.custom_fields, key),
      required: parsePresetFieldRequired(survey.custom_fields, key),
    })),
    ...customFieldDefs.map((field) => ({ label: field.label, required: field.required === true })),
  ];

  const responseList = responses ?? [];
  const qualifiedCount = responseList.filter((r) => r.status === "qualified").length;
  const completionRate =
    responseList.length > 0
      ? Math.round((responseList.filter((r) => r.completed).length / responseList.length) * 100)
      : null;

  return (
    <div className="flex flex-col gap-10">
      <SurveyDetailView
        survey={{
          id: survey.id,
          status: survey.status,
          title: survey.title,
          externalTitle: survey.external_title ?? "",
          slug: survey.slug,
          topic: survey.topic ?? "",
          targetAudience: [survey.target_industry, survey.target_job_title, survey.target_company_size]
            .filter((segment) => segment && segment.trim())
            .join(" · "),
          tone: survey.tone ?? "",
          numQuestions: survey.num_questions != null ? String(survey.num_questions) : "",
          questionGuide: survey.question_guide ?? "",
          respondentChips,
        }}
        responseCount={responseList.length}
        qualifiedCount={qualifiedCount}
        completionRate={completionRate}
        initialValues={initialValues}
      />

      <ResponsesTable responses={responseList} />
    </div>
  );
}
