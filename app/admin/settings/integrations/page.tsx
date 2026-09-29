import { createClient } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { getHubSpotClientFromEnv } from "@/lib/hubspot-sync";
import { isValidSlackWebhookUrl } from "@/lib/slack/lead-notification";
import { IntegrationsView } from "./IntegrationsView";
import type { ConnectionStatus } from "./_components/StatusPill";

/**
 * A Slack incoming webhook is hooks.slack.com/services/T…/B…/secret. The
 * first segment is the workspace id, which is the only part of the URL a
 * page may show: the rest is the credential.
 */
function slackWorkspaceId(url: string): string | null {
  const match = /\/services\/([A-Z0-9]+)\//i.exec(url);
  return match ? match[1] : null;
}

export default async function IntegrationSettingsPage() {
  const org = await getActiveOrg();
  const canEdit = can(org?.role, "profile:edit");

  // Whether a token is configured, never the token. There is no portal id
  // or connected date on record: the token is the whole connection.
  const hubspotConnected = getHubSpotClientFromEnv() !== null;

  let slackUrl = "";
  if (org) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("slack_webhook_url")
      .eq("org_id", org.orgId)
      .maybeSingle();
    slackUrl = data?.slack_webhook_url?.trim() ?? "";
  }
  const slackConnected = slackUrl.length > 0;
  const slackStatus: ConnectionStatus = !slackConnected
    ? "disconnected"
    : isValidSlackWebhookUrl(slackUrl)
      ? "connected"
      : "error";

  return (
    <IntegrationsView
      hubspotConnected={hubspotConnected}
      slackConnected={slackConnected}
      slackStatus={slackStatus}
      slackWorkspaceId={slackConnected ? slackWorkspaceId(slackUrl) : null}
      canEdit={canEdit}
    />
  );
}
