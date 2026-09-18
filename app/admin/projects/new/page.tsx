import Link from "next/link";
import { NewStudyWizard } from "@/components/NewStudyWizard";
import { can, requireActiveOrg } from "@/lib/org";
import { Button, EmptyState, PageHeader, PageShell } from "@/components/admin/ui";

// No wrapper here: most steps render their own "Surveys" / "New survey"
// header inside NewStudyWizard's boxed layout, but the redesigned
// External name step (design_handoff_create_survey) takes over the full
// content area itself (two-pane, no outer page title) — see the
// STEP_EXTERNAL_NAME branch in NewStudyWizard for why that header can't
// live at this level anymore.
export default async function NewStudyPage() {
  // Resolved once here so the wizard can stamp the new study with the
  // organization it belongs to. The role check is the server-side half of
  // hiding "New study" from members: reaching this URL directly renders the
  // refusal below, and the surveys insert policy refuses the write anyway.
  const { orgId, role } = await requireActiveOrg();
  if (!can(role, "study:create")) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={
            <Link href="/admin/projects" className="focus-ring rounded-control hover:text-card-foreground">
              Projects
            </Link>
          }
          title="New study"
        />
        <EmptyState
          title="Only owners and admins can create studies."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/projects">Back to projects</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }
  return <NewStudyWizard orgId={orgId} />;
}
