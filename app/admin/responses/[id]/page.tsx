import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { listMembers } from "@/lib/org-team";
import { fetchLeadActivity } from "@/lib/leads/activity";
import type { InterviewMessage } from "@/lib/interview/types";
import { parseCallScript } from "@/lib/interview/call-script";
import { EMPTY_VALUE } from "@/lib/format";
import { ResponseDetailView, type ResponseDetailData } from "./ResponseDetailView";
import type { WorkflowMember, WorkflowPermissions } from "./LeadWorkflowPanel";

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ orgId, role }, user] = await Promise.all([requireActiveOrg(), getCurrentUser()]);

  // Cookie client: the org-member read policy is what decides whether this
  // response is visible at all. Everything fetched with the service role
  // below (trail, members) happens only once that read has succeeded.
  const { data: response } = await supabase
    .from("responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!response) {
    notFound();
  }

  const [{ data: survey }, activity, members] = await Promise.all([
    supabase.from("surveys").select("id, title").eq("id", response.survey_id).maybeSingle(),
    fetchLeadActivity(response.id),
    listMembers(orgId),
  ]);
  const workflowMembers: WorkflowMember[] = members.map((m) => ({
    id: m.userId,
    name: m.name ?? m.email ?? EMPTY_VALUE,
  }));
  const assigneeName = response.assigned_to
    ? (workflowMembers.find((m) => m.id === response.assigned_to)?.name ?? null)
    : null;
  // Every gate reads the matrix; the actions re-check it server-side.
  const permissions: WorkflowPermissions = {
    claim: can(role, "lead:claim"),
    assignOthers: can(role, "lead:assignOthers"),
    setStatus: can(role, "lead:setStatus"),
    note: can(role, "lead:note"),
  };

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

  const messages = (response.messages as unknown as InterviewMessage[] | null) ?? [];

  const data: ResponseDetailData = {
    responseId: response.id,
    survey: survey ? { id: survey.id, title: survey.title } : null,
    respondentName: response.respondent_name,
    // Kept as three fields rather than one joined line: the header sets the
    // role and company on one line and the email on its own as a mailto, so
    // the view needs them apart.
    role: jobTitle,
    company,
    email: response.respondent_email,
    isTest: response.is_test,
    completed: response.completed,
    // There is no completed_at column; created_at is the stamp the Leads
    // queue already labels "Completed" for a finished response.
    createdAt: response.created_at,
    messageCount: messages.length,
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
    messages,
    workflow: {
      leadStatus: response.lead_status,
      assignedTo: response.assigned_to,
      assigneeName,
      disqualifyReason: response.disqualify_reason,
      disqualifyNote: response.disqualify_note,
      members: workflowMembers,
      currentUserId: user?.id ?? "",
      permissions,
      activity,
    },
  };

  return <ResponseDetailView data={data} />;
}
