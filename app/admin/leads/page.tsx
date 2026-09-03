import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { listMembers } from "@/lib/org-team";
import { fetchLeadQueue } from "@/lib/lead-queue";
import { Button, EmptyState, PageHeader, PageShell } from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import { LeadsQueue, isQueueTab, type LeadItem, type QueueTab } from "./LeadsQueue";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const [{ orgId, role }, user, params] = await Promise.all([
    requireActiveOrg(),
    getCurrentUser(),
    searchParams,
  ]);
  const currentUserId = user?.id ?? "";

  // Every gate on this page reads the matrix. The server actions behind the
  // controls check it again on their own (lib/leads/actions.ts).
  const permissions = {
    claim: can(role, "lead:claim"),
    assignOthers: can(role, "lead:assignOthers"),
  };
  const canCreateStudy = can(role, "study:create");

  // Cookie-authenticated client: the org-member read policy on responses is
  // what scopes rows to this organization. No user filter on top, on
  // purpose: a user_id filter here would hide teammates' leads. The one rule
  // applied is the shared lead-queue one: responses on archived studies are
  // excluded at the database (lib/lead-queue.ts), so every count on this
  // page derives from the same set.
  const [{ responses, fitRows, error }, members] = await Promise.all([
    fetchLeadQueue(supabase),
    listMembers(orgId),
  ]);
  const fitById = new Map(
    (fitRows ?? []).map((r) => [r.id, { score: r.fit_score, confidence: r.fit_confidence, reasoning: r.fit_reasoning }])
  );
  const memberName = new Map(members.map((m) => [m.userId, m.name ?? m.email ?? EMPTY_VALUE]));

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
      surveyTitle: r.surveys?.title ?? EMPTY_VALUE,
      // Drives the live dot on the study filters above the queue. Anything
      // that isn't "live" (draft, closed, archived) reads as not collecting.
      surveyIsLive: r.surveys?.status === "live",
      leadScore: r.lead_score,
      fitScore: fit?.score ?? null,
      fitConfidence: typeof fit?.confidence === "string" ? fit.confidence : null,
      fitReasoning: typeof fit?.reasoning === "string" ? fit.reasoning : null,
      leadStatus: r.lead_status,
      assignedTo: r.assigned_to,
      // A lead held by someone who has since left the team is still held;
      // the row says so rather than reading as unassigned.
      assigneeName: r.assigned_to ? (memberName.get(r.assigned_to) ?? "Former teammate") : null,
      lastActivityAt: r.last_activity_at,
      topPainPoint: typeof painPoints[0] === "string" ? painPoints[0] : null,
      createdAt: r.created_at,
      isTest: r.is_test,
      source: r.source,
    };
  });

  // A rep lands on their own work without clicking: Mine when they hold any
  // lead, Unworked otherwise. A deep link overrides that, including the
  // admin home's older ?status=new form, which means the unworked set.
  const hasMine = items.some((lead) => lead.assignedTo === currentUserId && !lead.isTest);
  const defaultTab: QueueTab = hasMine ? "mine" : "unworked";
  const initialTab: QueueTab = isQueueTab(params.tab)
    ? params.tab
    : params.status === "new"
      ? "unworked"
      : defaultTab;

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/live">Live now</Link>
          </Button>
        }
      />

      {error && <p className="type-body text-destructive">{error.message}</p>}

      {!error && items.length > 0 && (
        <LeadsQueue
          items={items}
          members={members.map((m) => ({ id: m.userId, name: m.name ?? m.email ?? EMPTY_VALUE }))}
          currentUserId={currentUserId}
          permissions={permissions}
          initialTab={initialTab}
        />
      )}

      {!error && items.length === 0 && (
        <EmptyState
          title="No leads yet. Completed interviews land here."
          action={
            canCreateStudy ? (
              <Button asChild size="sm">
                <Link href="/admin/surveys/new">New study</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </PageShell>
  );
}
