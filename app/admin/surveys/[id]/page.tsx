import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { type ResponseTableRow } from "./ResponsesTable";
import { SurveyDetailView, type RespondentChip } from "./SurveyDetailView";
import { type SurveyReportRow } from "./ReportSection";
import { type SurveyFormValues } from "@/components/SurveyForm";
import { countWorthACall } from "@/lib/leads";
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
  const { orgId, role } = await requireActiveOrg();

  // Neither query depends on the other's result (responses is filtered by
  // the route param, not by anything read off the survey row), so they run
  // concurrently instead of the survey fetch blocking the responses fetch.
  //
  // The survey lookup carries an explicit org filter: surveys_public_read
  // makes every survey row readable, so without it another organization's
  // study would render here (with an empty response list) instead of 404ing.
  const [{ data: survey }, { data: responses }, { data: latestReport }] = await Promise.all([
    supabase.from("surveys").select("*").eq("id", id).eq("org_id", orgId).maybeSingle(),
    supabase.from("responses").select("*").eq("survey_id", id).order("created_at", { ascending: false }),
    supabase
      .from("survey_reports")
      .select("*")
      .eq("survey_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
    publicDescription: survey.public_description ?? "",
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

  // Owner test runs are excluded from the stats and the table both — they
  // remain reachable via their direct /admin/responses/[id] links. The
  // seeded sample survey is the exception: its rows are all is_test by
  // design, and hiding them would make the demo look dead.
  const responseList = (responses ?? []).filter((r) => survey.is_sample || !r.is_test);
  const completedResponses = responseList.filter((r) => r.completed);

  // The same function the Leads page's survey cards use, so the two figures
  // cannot describe the same study differently again. This stat used to count
  // `status === "qualified"` under the label "Qualified leads", which is a
  // manual status a human sets, not a score threshold — hence 0 on a study
  // whose responses scored 9, 9, 8, 7. See lib/leads.ts.
  const worthACallCount = countWorthACall(
    completedResponses.map((r) => ({ leadScore: r.lead_score, status: r.status }))
  );

  const completionRate =
    responseList.length > 0
      ? Math.round((completedResponses.length / responseList.length) * 100)
      : null;

  // created_at is the moment the interview started; there is no completed_at
  // column, and the Leads queue's own "Completed" column already reads this
  // field. Rows arrive newest-first from the query above.
  const lastResponseAt = completedResponses[0]?.created_at ?? null;

  // Company, in the order the Leads queue resolves it: the collected field
  // first, then the value derived from a work email domain. The email domain
  // is carried separately so the table can render it as the muted fallback it
  // is rather than passing it off as a company the respondent gave us.
  const responseRows: ResponseTableRow[] = responseList.map((r) => {
    const customValues = (r.custom_field_values as Record<string, unknown> | null) ?? {};
    const email = r.respondent_email ?? "";
    const atIndex = email.lastIndexOf("@");
    return {
      id: r.id,
      name: r.respondent_name,
      company:
        typeof customValues.company === "string" && customValues.company.trim()
          ? customValues.company
          : typeof customValues.derived_company_name === "string" &&
              customValues.derived_company_name.trim()
            ? customValues.derived_company_name
            : null,
      emailDomain: atIndex > -1 ? email.slice(atIndex + 1) || null : null,
      leadScore: r.lead_score,
      status: r.status ?? "new",
      completed: r.completed,
      createdAt: r.created_at,
    };
  });

  // Every response row is a "start" (created the moment the interview
  // begins), so grouping the same responseList by source gives starts and
  // completions per channel for free. Untagged rows bucket under "Direct"
  // rather than being dropped, so a survey with one tagged source plus
  // organic traffic still shows a real comparison. Only worth showing once
  // there's actually something to compare — a single bucket (all direct,
  // or every response from the same source) isn't a breakdown.
  const sourceBuckets = new Map<string, { starts: number; completions: number }>();
  for (const r of responseList) {
    const key = r.source?.trim() || "Direct";
    const bucket = sourceBuckets.get(key) ?? { starts: 0, completions: 0 };
    bucket.starts += 1;
    if (r.completed) bucket.completions += 1;
    sourceBuckets.set(key, bucket);
  }
  const sourceBreakdown =
    sourceBuckets.size > 1
      ? Array.from(sourceBuckets, ([source, counts]) => ({ source, ...counts })).sort(
          (a, b) => b.starts - a.starts
        )
      : null;

  return (
    <SurveyDetailView
      survey={{
        id: survey.id,
        status: survey.status,
        archived: survey.archived_at !== null,
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
        publishPublic: survey.publish_public ?? false,
      }}
      responses={responseRows}
      responseCount={completedResponses.length}
      inProgressCount={responseList.length - completedResponses.length}
      worthACallCount={worthACallCount}
      completionRate={completionRate}
      lastResponseAt={lastResponseAt}
      sourceBreakdown={sourceBreakdown}
      initialValues={initialValues}
      latestReport={
        latestReport
          ? {
              id: latestReport.id,
              content: latestReport.content as unknown as SurveyReportRow["content"],
              respondent_count: latestReport.respondent_count,
              created_at: latestReport.created_at,
              published: latestReport.published ?? false,
            }
          : null
      }
      completedInterviewCount={completedResponses.length}
      permissions={{
        edit: can(role, "study:edit"),
        generateReport: can(role, "report:generate"),
        publishReport: can(role, "report:publish"),
      }}
    />
  );
}
