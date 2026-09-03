import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireOrgPermission } from "@/lib/org";
import { isValidSlackWebhookUrl, SLACK_WEBHOOK_URL_PREFIX } from "@/lib/slack/lead-notification";

// POST /api/settings/slack-webhook
// Body: { url: string | null }
// Admin-only. Saves (or, with an empty/null url, clears) the organization's
// Slack webhook URL. Uses the cookie-authenticated client, so the org
// admin write policy on profiles scopes the write to the caller's own org.
// Server-side validation is the actual gate here — the settings form also
// checks the prefix client-side, but only as a fast hint, never as the
// source of truth.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let orgId: string;
  try {
    ({ orgId } = await requireOrgPermission("profile:edit"));
  } catch (err) {
    return orgErrorResponse(err);
  }

  let body: { url?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";

  if (raw && !isValidSlackWebhookUrl(raw)) {
    return NextResponse.json(
      { error: `Webhook URL must start with ${SLACK_WEBHOOK_URL_PREFIX}` },
      { status: 400 }
    );
  }

  // Update-or-insert by org, not an upsert on user_id: the profile is the
  // organization's single row (unique on org_id), and a brand-new org
  // visiting Settings before the profile page wouldn't have one yet. Only
  // slack_webhook_url is written on the update path, so this can't clobber
  // any other profile field.
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const { error } = existing
    ? await supabase.from("profiles").update({ slack_webhook_url: raw || null }).eq("org_id", orgId)
    : await supabase
        .from("profiles")
        .insert({ user_id: user.id, org_id: orgId, slack_webhook_url: raw || null });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: raw || null });
}
