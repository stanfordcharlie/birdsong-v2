import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SlackNotificationsForm } from "./SlackNotificationsForm";
import { PageHeader, PageShell, adminButtonVariants } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { AddSampleDataButton, RemoveSampleDataButton } from "@/components/SampleDataControls";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h2 className="type-eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const org = await getActiveOrg();
  const canEditProfile = can(org?.role, "profile:edit");
  const canCreateStudy = can(org?.role, "study:create");
  const { data: profile } = org
    ? await supabase.from("profiles").select("slack_webhook_url").eq("org_id", org.orgId).maybeSingle()
    : { data: null };

  return (
    <PageShell>
      {/* The eyebrow names the section the sidebar's account menu reached
          this page through, rather than repeating the H1 verbatim. */}
      <PageHeader eyebrow="Account" title="Settings" />

      <div className="admin-measure flex flex-col">
        <Section title="Account">
          <div className="flex items-center justify-between gap-5">
            <div className="flex flex-col gap-0.5">
              <span className="font-archivo text-micro text-muted-foreground">Email</span>
              <span className="type-body">{user?.email ?? "Not signed in"}</span>
            </div>
            <SignOutButton className={cn(adminButtonVariants({ variant: "secondary", size: "sm" }))} />
          </div>
        </Section>

        <Section title="Change email">
          <ChangeEmailForm />
        </Section>

        <Section title="Change password">
          <ChangePasswordForm />
        </Section>

        {canEditProfile && (
          <Section title="Notifications">
            <SlackNotificationsForm initialUrl={profile?.slack_webhook_url ?? null} />
          </Section>
        )}

        {canCreateStudy && (
        <Section title="Sample data">
          <div className="flex flex-col items-start gap-3">
            {/* The consequence a reader cannot predict: sample rows are inert. */}
            <p className="type-body-sm text-muted-foreground">
              One demo study with eight test responses. Test responses never count as leads or send
              email.
            </p>
            <div className="flex items-center gap-2">
              <AddSampleDataButton className={cn(adminButtonVariants({ variant: "secondary", size: "sm" }))} />
              <RemoveSampleDataButton
                className={cn(adminButtonVariants({ variant: "secondary", size: "sm" }), "text-destructive")}
              />
            </div>
          </div>
        </Section>
        )}
      </div>
    </PageShell>
  );
}
