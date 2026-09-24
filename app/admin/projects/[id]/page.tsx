import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { type ResponseTableRow } from "./ResponsesTable";
import { StudyDetailView, type RespondentChip, type SourceBreakdownRow } from "./StudyDetailView";
import { isSystemSource } from "@/lib/interview/source";
import { type SurveyReportRow } from "./ReportSection";
import { type StudyFormValues } from "@/components/StudyForm";
import { countWorthACall } from "@/lib/leads";
import { loadProspectRoster, prospectDisplayName, prospectLastActivity } from "./prospects/query";
import type { ProspectsPreviewData } from "./ProspectsPreview";
import {
  parseCustomRespondentFieldDefs,
  parseEnabledRespondentFields,
  parsePresetFieldLabel,
  parsePresetFieldRequired,
} from "@/lib/studies/respondent-fields";

export default async function StudyDetailPage({
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
  const [{ data: survey }, { data: responses }, { data: latestReport }, prospects] = await Promise.all([
    supabase.from("surveys").select("*").eq("id", id).eq("org_id", orgId).maybeSingle(),
    supabase.from("responses").select("*").eq("survey_id", id).order("created_at", { ascending: false }),
    supabase
      .from("survey_reports")
      .select("*")
      .eq("survey_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadProspectRoster(supabase, id),
  ]);

  if (!survey) {
    notFound();
  }

  const enabledFields = parseEnabledRespondentFields(survey.custom_fields);
  const customFieldDefs = parseCustomRespondentFieldDefs(survey.custom_fields);
  const initialValues: StudyFormValues = {
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
    interviewLength: survey.interview_length,
    giftCardAmount: survey.gift_card_amount != null ? String(survey.gift_card_amount) : "",
    giftCardBrand: survey.gift_card_brand ?? "",
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
  // the order StudyForm lists them in, so the read view's chip order
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

  // created_at is the moment the interview started, and the Leads queue's
  // own "Completed" column reads this field too. Rows arrive newest-first
  // from the query above.
  const lastResponseAt = completedResponses[0]?.created_at ?? null;

  // Outreach at a glance: the funnel counts and the five prospects with the
  // most recent activity, drawn with the roster page's own cells.
  const byActivity = [...prospects].sort(
    (x, y) => new Date(prospectLastActivity(y)).getTime() - new Date(prospectLastActivity(x)).getTime()
  );
  const prospectsPreview: ProspectsPreviewData = {
    total: prospects.length,
    counts: {
      pending: prospects.filter((p) => p.status === "pending").length,
      started: prospects.filter((p) => p.status === "started").length,
      completed: prospects.filter((p) => p.status === "completed").length,
      removed: prospects.filter((p) => p.instantly_removed_at !== null).length,
    },
    rows: byActivity.slice(0, 5).map((p) => ({
      id: p.id,
      name: prospectDisplayName(p),
      company: p.company_name,
      status: p.status,
      instantlyRemovedAt: p.instantly_removed_at,
      instantlyError: p.instantly_error,
      lastActivity: prospectLastActivity(p),
    })),
  };

  // How long a real interview takes, to check the length preset's promise
  // against. completed_at exists only on rows finished since it was added,
  // and seeded interviews are excluded (their timing is the script's, not a
  // person's). Null until three rows qualify: a median of one or two is a
  // sample, not a figure.
  const completionMs = completedResponses
    .filter((r) => r.completed_at && r.source !== "seed")
    .map((r) => new Date(r.completed_at as string).getTime() - new Date(r.created_at).getTime())
    .filter((ms) => Number.isFinite(ms) && ms >= 0)
    .sort((x, y) => x - y);
  const medianCompletionMs =
    completionMs.length >= 3
      ? completionMs.length % 2 === 1
        ? completionMs[(completionMs.length - 1) / 2]
        : (completionMs[completionMs.length / 2 - 1] + completionMs[completionMs.length / 2]) / 2
      : null;

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
  //
  // Two kinds of row. "Direct" (no tag) and "Outbound" (a response that began
  // from a prospect's token link; /api/interview/start writes the reserved
  // value itself) are assigned by Birdsong. Everything else is a ?src= tag
  // the admin put on a link, shown verbatim so it matches what they typed.
  const sourceBuckets = new Map<string, SourceBreakdownRow>();
  for (const r of responseList) {
    const tag = r.source?.trim() || null;
    const row: Pick<SourceBreakdownRow, "source" | "kind"> = !tag
      ? { source: "Direct", kind: "system" }
      : isSystemSource(tag)
        ? { source: "Outbound", kind: "system" }
        : { source: tag, kind: "tag" };
    const bucket = sourceBuckets.get(row.source) ?? { ...row, starts: 0, completions: 0 };
    bucket.starts += 1;
    if (r.completed) bucket.completions += 1;
    sourceBuckets.set(row.source, bucket);
  }
  const sourceBreakdown =
    sourceBuckets.size > 1
      ? Array.from(sourceBuckets.values()).sort((a, b) => b.starts - a.starts)
      : null;

  return (
    <StudyDetailView
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
        interviewLength: survey.interview_length,
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
      medianCompletionMs={medianCompletionMs}
      prospects={prospectsPreview}
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
