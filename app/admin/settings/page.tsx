import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SlackNotificationsForm } from "./SlackNotificationsForm";
import { Card, PageHeader, PageShell } from "@/components/admin/ui";
import { adminButtonVariants } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { AddSampleDataButton, RemoveSampleDataButton } from "@/components/SampleDataControls";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: profile } = user
    ? await supabase.from("profiles").select("slack_webhook_url").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <PageShell>
      {/* The eyebrow names the section the sidebar's account menu reached
          this page through, rather than repeating the H1 verbatim. */}
      <PageHeader eyebrow="Account" title="Settings" />

      <div className="flex flex-col gap-5">
        <Card>
          <div className="pb-4">
            <h2 className="type-heading">Account</h2>
          </div>
          <div className="flex items-end justify-between gap-5">
            <div className="flex flex-col gap-1">
              <span className="type-table-head">Email</span>
              <span className="type-body">{user?.email ?? "Not signed in"}</span>
            </div>
            <SignOutButton className={cn(adminButtonVariants({ variant: "secondary" }))} />
          </div>
        </Card>

        <Card>
          <div className="pb-4">
            <h2 className="type-heading">Change email</h2>
          </div>
          <div>
            <ChangeEmailForm />
          </div>
        </Card>

        <Card>
          <div className="pb-4">
            <h2 className="type-heading">Change password</h2>
          </div>
          <div>
            <ChangePasswordForm />
          </div>
        </Card>

        <Card>
          <div className="pb-4">
            <h2 className="type-heading">Notifications</h2>
          </div>
          <div>
            <SlackNotificationsForm initialUrl={profile?.slack_webhook_url ?? null} />
          </div>
        </Card>

        <Card>
          <div className="pb-4">
            <h2 className="type-heading">Sample data</h2>
          </div>
          <div className="flex flex-col items-start gap-3">
            <p className="type-body text-muted-foreground">
              Explore Birdsong with a demo survey and eight realistic test responses. Sample data
              never counts as real leads, never emails you, and removes cleanly.
            </p>
            <div className="flex items-center gap-3">
              <AddSampleDataButton className={cn(adminButtonVariants({ variant: "secondary" }))} />
              <RemoveSampleDataButton
                className={cn(adminButtonVariants({ variant: "secondary" }), "text-destructive")}
              />
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
