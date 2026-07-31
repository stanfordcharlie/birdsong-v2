import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSlackWebhookUrl, SLACK_WEBHOOK_URL_PREFIX } from "@/lib/slack/lead-notification";

// POST /api/settings/slack-webhook
// Body: { url: string | null }
// Admin-only. Saves (or, with an empty/null url, clears) the signed-in
// admin's Slack webhook URL. Uses the cookie-authenticated client, so
// profiles_owner_all RLS scopes the write to the caller's own row. Server-
// side validation is the actual gate here — the settings form also checks
// the prefix client-side, but only as a fast hint, never as the source of
// truth.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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

  // upsert, not update: a profiles row is only created once the admin
  // completes company-profile onboarding (see app/admin/profile/ProfileGate),
  // so a brand-new admin visiting Settings first wouldn't have one yet. Only
  // user_id and slack_webhook_url are in the payload, so this can't clobber
  // any other profile field on conflict.
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, slack_webhook_url: raw || null }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: raw || null });
}
