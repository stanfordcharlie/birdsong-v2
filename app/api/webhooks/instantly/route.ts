import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/webhooks/instantly?token=<INSTANTLY_WEBHOOK_SECRET>
//
// Instantly tells us it has emailed a prospect; the roster stops saying
// "Pending" for someone who is three emails into a sequence, and the Sequence
// column says which step they are on.
//
// This is the first endpoint in the app that a third party calls, so what
// stands in front of it is worth stating plainly:
//
//   - Nobody is signed in, so there is no session and no RLS to lean on. The
//     only gate is the shared secret in the query string, compared in
//     constant time. Instantly's webhooks have no signature to verify, and a
//     query parameter is what their UI can send, so that is what this takes.
//   - Everything after the gate runs with the service role, which bypasses
//     RLS entirely. Every read therefore names its columns (CLAUDE.md), and
//     nothing from the payload reaches a query except as a bound value.
//   - A webhook that answers anything but 2xx is retried, sometimes for days.
//     So an event this app cannot place (unknown campaign, unknown person,
//     an event type we do not handle yet) is logged and answered 200: there
//     is nothing to retry, because nothing failed. Only a genuine failure on
//     our side (a database error) returns 5xx and earns a retry.
//
// Reply, open, click and bounce events are next; they are logged and ignored
// here.

export const runtime = "nodejs";

const SCOPE = "webhooks/instantly";

/** Instantly's name for the only event this handles today. */
const EMAIL_SENT = "email_sent";

type Matched = {
  surveyId: string;
  prospectId: string;
  status: string;
  sentAt: string | null;
};

function log(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ scope: SCOPE, event, ...fields }));
}

/** Constant time, and never throws on a length mismatch. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function firstString(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * The step, as a positive integer. Instantly sends it as a number on some
 * events and as a string on others, so both are read; anything else is
 * treated as absent rather than coerced into a 0.
 */
function firstStep(source: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

// Instantly's payload keys are not stable across their own docs and event
// types, so each field is read from the spellings seen in the wild rather
// than from one guessed name. An event whose fields none of these match is
// logged with its key list, which is what turns "nothing happened" into a
// five minute fix instead of an investigation.
const EMAIL_KEYS = ["lead_email", "email", "lead", "to_email", "prospect_email"] as const;
const CAMPAIGN_KEYS = ["campaign_id", "campaignId", "campaign", "campaign_name"] as const;
const STEP_KEYS = ["step", "step_number", "sequence_step", "email_step", "variant_step"] as const;

export async function POST(request: Request) {
  const expected = process.env.INSTANTLY_WEBHOOK_SECRET;
  if (!expected) {
    // Not the caller's fault, and not something a retry fixes, but it must be
    // loud: without the secret set, this endpoint cannot safely accept
    // anything at all.
    console.error(JSON.stringify({ scope: SCOPE, event: "missing_env", name: "INSTANTLY_WEBHOOK_SECRET" }));
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token || !secretMatches(token, expected)) {
    log("unauthorized", { hasToken: Boolean(token) });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("not an object");
    payload = body as Record<string, unknown>;
  } catch {
    log("bad_json", {});
    return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const eventType = firstString(payload, ["event_type", "event", "type"]);
  if (eventType !== EMAIL_SENT) {
    // Reply, open, click, bounce, and anything else they add later.
    log("ignored_event", { eventType });
    return NextResponse.json({ status: "ignored", eventType });
  }

  const email = firstString(payload, EMAIL_KEYS);
  const campaignId = firstString(payload, CAMPAIGN_KEYS);
  const step = firstStep(payload, STEP_KEYS);

  if (!email || !campaignId) {
    log("unreadable_payload", { eventType, hasEmail: Boolean(email), hasCampaign: Boolean(campaignId), keys: Object.keys(payload) });
    return NextResponse.json({ status: "ignored", reason: "missing email or campaign" });
  }

  const admin = createAdminClient();

  // Service role: exact columns only, and one study per campaign. A campaign
  // mapped to two studies would be a configuration mistake, not something to
  // guess at, so this takes the first and says so in the log.
  const { data: surveys, error: surveyError } = await admin
    .from("surveys")
    .select("id")
    .eq("instantly_campaign_id", campaignId)
    .limit(2);

  if (surveyError) {
    console.error(JSON.stringify({ scope: SCOPE, event: "survey_lookup_failed", message: surveyError.message }));
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!surveys || surveys.length === 0) {
    log("unmatched_campaign", { campaignId, email });
    return NextResponse.json({ status: "unmatched", reason: "no study for that campaign" });
  }
  if (surveys.length > 1) {
    log("ambiguous_campaign", { campaignId, email, note: "more than one study carries this campaign id; using the first" });
  }
  const surveyId = surveys[0].id;

  // lower(email) on both sides, which is how prospects are made unique per
  // study (prospects_survey_email_idx). ILIKE is that comparison in
  // PostgREST's vocabulary; the wildcards LIKE would otherwise honour are
  // escaped, so this is an equality test and not a pattern.
  const pattern = email.replace(/([\\%_])/g, "\\$1");
  const { data: prospects, error: prospectError } = await admin
    .from("prospects")
    .select("id, status, sent_at")
    .eq("survey_id", surveyId)
    .ilike("email", pattern)
    .limit(1);

  if (prospectError) {
    console.error(JSON.stringify({ scope: SCOPE, event: "prospect_lookup_failed", message: prospectError.message }));
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!prospects || prospects.length === 0) {
    // Someone in the campaign who is not on this study's roster: a lead added
    // in Instantly by hand, or one imported before the study existed.
    log("unmatched_prospect", { campaignId, surveyId, email });
    return NextResponse.json({ status: "unmatched", reason: "no prospect with that email on the study" });
  }
  const matched: Matched = {
    surveyId,
    prospectId: prospects[0].id,
    status: prospects[0].status,
    sentAt: prospects[0].sent_at,
  };

  const now = new Date().toISOString();

  // Always recorded, whatever state the prospect is in: a completed
  // respondent still moves through the sequence until the completion path
  // takes them out of it, and the step is the useful part of that.
  const { error: stampError } = await admin
    .from("prospects")
    .update({
      ...(step !== null ? { sequence_step: step } : {}),
      last_sent_at: now,
      // First send only. After that this column is the first touch and
      // last_sent_at is the latest.
      ...(matched.sentAt ? {} : { sent_at: now }),
    })
    .eq("id", matched.prospectId);

  if (stampError) {
    console.error(JSON.stringify({ scope: SCOPE, event: "stamp_failed", prospectId: matched.prospectId, message: stampError.message }));
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Forward only, and decided by the database rather than by what was read a
  // moment ago: the filter is the guard, so a prospect who started or
  // finished in between cannot be dragged back to "sent".
  let statusMoved = false;
  if (matched.status === "pending") {
    const { data: moved, error: statusError } = await admin
      .from("prospects")
      .update({ status: "sent" })
      .eq("id", matched.prospectId)
      .eq("status", "pending")
      .select("id");

    if (statusError) {
      console.error(JSON.stringify({ scope: SCOPE, event: "status_update_failed", prospectId: matched.prospectId, message: statusError.message }));
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    statusMoved = (moved ?? []).length > 0;
  }

  log("email_sent", {
    campaignId,
    surveyId,
    prospectId: matched.prospectId,
    step,
    statusBefore: matched.status,
    statusMoved,
  });

  return NextResponse.json({
    status: "ok",
    prospectId: matched.prospectId,
    step,
    statusMoved,
  });
}
