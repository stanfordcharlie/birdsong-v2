import { createClient } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { EmptyState } from "@/components/admin/ui";
import { SettingRow, SettingsSection } from "../SettingsSection";
import { SlackNotificationsForm } from "./SlackNotificationsForm";

export default async function NotificationSettingsPage() {
  const org = await getActiveOrg();
  const canEdit = can(org?.role, "profile:edit");

  // Read here and reduced to a boolean: the URL itself is a credential and
  // is not handed to the browser.
  let webhookSet = false;
  if (org && canEdit) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("slack_webhook_url")
      .eq("org_id", org.orgId)
      .maybeSingle();
    webhookSet = Boolean(data?.slack_webhook_url?.trim());
  }

  return (
    <SettingsSection title="Notifications" description="How you hear about a lead.">
      {canEdit ? (
        <div className="flex flex-col">
          <SettingRow
            title="Slack"
            description={
              <>
                A message per qualified lead, posted to the channel behind this webhook.{" "}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-[var(--ds-radius-chip)] underline"
                >
                  Webhooks guide
                </a>
              </>
            }
          >
            <SlackNotificationsForm webhookSet={webhookSet} />
          </SettingRow>
        </div>
      ) : (
        <EmptyState title="Only owners and admins can change notifications." />
      )}
    </SettingsSection>
  );
}
