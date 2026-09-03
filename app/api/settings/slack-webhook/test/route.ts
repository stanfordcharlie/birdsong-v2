import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireOrgPermission } from "@/lib/org";
import {
  buildSampleNotificationMessage,
  isValidSlackWebhookUrl,
  postSlackMessage,
  SLACK_WEBHOOK_URL_PREFIX,
} from "@/lib/slack/lead-notification";

// POST /api/settings/slack-webhook/test
// Body: { url: string }
// Admin-only. Sends a clearly-labeled sample lead message to the given
// webhook URL and reports success or failure inline in the settings form.
// Deliberately independent of is_test/real-lead semantics: this button's
// whole purpose is an on-demand test send, regardless of whether the URL
// has been saved yet.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await requireOrgPermission("profile:edit");
  } catch (err) {
    return orgErrorResponse(err);
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Enter a webhook URL first" }, { status: 400 });
  }
  if (!isValidSlackWebhookUrl(url)) {
    return NextResponse.json(
      { error: `Webhook URL must start with ${SLACK_WEBHOOK_URL_PREFIX}` },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const result = await postSlackMessage(url, buildSampleNotificationMessage(appUrl));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
