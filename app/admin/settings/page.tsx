import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SlackNotificationsForm } from "./SlackNotificationsForm";
import { SampleDataCard } from "./SampleDataCard";
import { Card, PageHeader, PageShell, adminButtonVariants } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

// Two columns per setting: what it is on the left, the control on the
// right in a Card. Rows are separated by a hairline. Sign out lives in the
// page header, not among the settings, because it is not one.
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-t border-border py-8 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="type-heading">{title}</h2>
        <p className="type-body max-w-[36ch] text-muted-foreground">{description}</p>
      </div>
      <Card>{children}</Card>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const org = await getActiveOrg();
  const canEditProfile = can(org?.role, "profile:edit");
  const canCreateStudy = can(org?.role, "study:create");

  const [{ data: profile }, { data: sampleSurvey }] = await Promise.all([
    org
      ? supabase.from("profiles").select("slack_webhook_url").eq("org_id", org.orgId).maybeSingle()
      : Promise.resolve({ data: null }),
    org && canCreateStudy
      ? supabase
          .from("surveys")
          .select("id, title")
          .eq("org_id", org.orgId)
          .eq("is_sample", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { count: sampleResponseCount } = sampleSurvey
    ? await supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .eq("survey_id", sampleSurvey.id)
        .eq("is_test", true)
    : { count: null };

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        subtitle="Account, security and notifications for this workspace."
        actions={<SignOutButton className={cn(adminButtonVariants({ variant: "secondary" }))} />}
      />

      <div className="flex flex-col">
        <SettingRow
          title="Account"
          description="The address you sign in with. Notifications about leads go here too."
        >
          <ChangeEmailForm email={user?.email ?? null} />
        </SettingRow>

        <SettingRow
          title="Password"
          description="At least 10 characters. You'll stay signed in on this device."
        >
          <ChangePasswordForm />
        </SettingRow>

        {canEditProfile && (
          <SettingRow
            title="Slack notifications"
            description={
              <>
                A message per qualified lead, posted to the channel behind this webhook.{" "}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-control underline"
                >
                  Webhooks guide
                </a>
              </>
            }
          >
            <SlackNotificationsForm initialUrl={profile?.slack_webhook_url ?? null} />
          </SettingRow>
        )}

        {canCreateStudy && (
          <SettingRow
            title="Sample data"
            description="One demo study with eight test responses, for exploring the dashboard. Test responses never count as leads or send email."
          >
            <SampleDataCard
              sample={
                sampleSurvey
                  ? { title: sampleSurvey.title, responseCount: sampleResponseCount ?? 0 }
                  : null
              }
            />
          </SettingRow>
        )}
      </div>
    </PageShell>
  );
}
