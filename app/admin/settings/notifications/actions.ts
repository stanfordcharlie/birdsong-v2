"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { OrgAccessError, requireOrgPermission } from "@/lib/org";
import {
  buildSampleNotificationMessage,
  isValidSlackWebhookUrl,
  postSlackMessage,
} from "@/lib/slack/lead-notification";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Sends the sample lead message to the webhook already saved for this
 * organization.
 *
 * /api/settings/slack-webhook/test takes the URL in its body, which suited a
 * form that held the saved URL in the browser. The form no longer receives
 * it, so a test of the saved webhook has to read it here, on the server. Same
 * permission, same message and same sender as that route; nothing is written.
 */
export async function sendSavedSlackTestAction(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Not signed in" };
    const { orgId } = await requireOrgPermission("profile:edit");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("slack_webhook_url")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };

    const url = data?.slack_webhook_url?.trim() ?? "";
    if (!url) return { ok: false, error: "Enter a webhook URL first" };
    if (!isValidSlackWebhookUrl(url)) {
      return { ok: false, error: "The saved webhook is not a Slack webhook. Replace it and try again." };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await postSlackMessage(url, buildSampleNotificationMessage(appUrl));
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  } catch (err) {
    if (err instanceof OrgAccessError) return { ok: false, error: err.message };
    // The message only: a fetch error can carry the URL it was sent to.
    console.error("[slack] saved webhook test failed:", err instanceof Error ? err.name : typeof err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}
