import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InterviewMessage } from "@/lib/interview/types";
import { parseCallScript } from "@/lib/interview/call-script";
import { ResponseDetailView, type ResponseDetailData } from "./ResponseDetailView";

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: response } = await supabase
    .from("responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!response) {
    notFound();
  }

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title")
    .eq("id", response.survey_id)
    .maybeSingle();

  const customValues = (response.custom_field_values as Record<string, unknown> | null) ?? {};
  const jobTitle = typeof customValues.job_title === "string" ? customValues.job_title : null;
  const company =
    typeof customValues.company === "string"
      ? customValues.company
      : typeof customValues.derived_company_name === "string"
        ? customValues.derived_company_name
        : null;

  const rawSignals = response.signals as
    | {
        economic_buyer?: unknown;
        decision_criteria?: unknown;
        decision_process?: unknown;
        metrics?: unknown;
        champion?: unknown;
      }
    | null;
  const signals = [
    { label: "Economic buyer", value: rawSignals?.economic_buyer },
    { label: "Decision criteria", value: rawSignals?.decision_criteria },
    { label: "Decision process", value: rawSignals?.decision_process },
    { label: "Metrics", value: rawSignals?.metrics },
    { label: "Champion", value: rawSignals?.champion },
  ].filter(
    (signal): signal is { label: string; value: string } =>
      typeof signal.value === "string" && signal.value.trim().length > 0
  );

  const data: ResponseDetailData = {
    responseId: response.id,
    survey: survey ? { id: survey.id, title: survey.title } : null,
    respondentName: response.respondent_name,
    identityLine: [jobTitle, company, response.respondent_email].filter(Boolean).join(" · "),
    status: response.status ?? "new",
    isTest: response.is_test,
    completed: response.completed,
    // Null until the first successful sync, and absent entirely on databases
    // without the response_hubspot_sync migration, so read defensively the
    // same way the company-fit columns above are.
    hubspotSyncedAt: typeof response.hubspot_synced_at === "string" ? response.hubspot_synced_at : null,
    source: response.source,
    leadScore: response.lead_score,
    fitReason: response.fit_reason,
    // Company fit (lib/interview/company-fit.ts) — a separate assessment from
    // lead_score. Fields are absent until the response_company_fit migration
    // is applied, so read defensively.
    fitScore: typeof response.fit_score === "number" ? response.fit_score : null,
    fitReasoning: typeof response.fit_reasoning === "string" ? response.fit_reasoning : "",
    fitConfidence: typeof response.fit_confidence === "string" ? response.fit_confidence : null,
    summary: response.summary,
    painPoints: (response.pain_points as unknown as string[] | null) ?? [],
    // Reads both the paired shape and the flat strings written before pairing
    // existed; see lib/interview/call-script.ts.
    callScript: parseCallScript(response.call_script),
    signals,
    messages: (response.messages as unknown as InterviewMessage[] | null) ?? [],
  };

  return <ResponseDetailView data={data} />;
}
