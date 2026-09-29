import Link from "next/link";
import { NewStudyWizard } from "@/components/NewStudyWizard";
import { can, requireActiveOrg } from "@/lib/org";
import { Button, EmptyState, PageHeader, PageShell } from "@/components/admin/ui";
import { NewStudyConversation } from "./NewStudyConversation";

// Two ways to make a study at one address. The conversation is the page;
// `?mode=form` is the step-by-step wizard it replaced, unchanged, for anyone
// who would rather fill in fields.
//
// Neither gets a wrapper here. The conversation fills everything under the
// top bar, and the wizard draws its own header inside its own layout.
export default async function NewStudyPage({
  searchParams,
}: {
  searchParams?: { mode?: string | string[]; draft?: string | string[] };
}) {
  // Resolved once here so the new study can be stamped with the organization
  // it belongs to. The role check is the server-side half of hiding "New
  // study" from members: reaching this URL directly renders the refusal
  // below, and the surveys insert policy refuses the write anyway.
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

  if (searchParams?.mode === "form") {
    return <NewStudyWizard orgId={orgId} />;
  }

  const draft = typeof searchParams?.draft === "string" ? searchParams.draft : null;
  return <NewStudyConversation orgId={orgId} initialDraftId={draft} />;
}
