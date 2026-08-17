import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCallScript } from "@/lib/interview/call-script";
import { selectRespondentCompanyName } from "@/lib/lead-content";
import { syncResponseToHubSpot } from "@/lib/hubspot-sync";

// POST /api/responses/[id]/hubspot-sync
// Admin-only manual retry for the HubSpot sync that normally runs on its own
// when an interview completes. Same code path, same idempotence: the contact
// is matched by email and updated rather than duplicated, so pressing the
// button on an already-synced response refreshes it instead of doubling it.
//
// Uses the cookie-authenticated client, not the service role, so the
// responses_owner_all RLS policy scopes both the read and the write-back to
// responses this admin actually owns — no separate ownership check here.
//
// Unlike the completion path this one is awaited: a person is watching a
// button and wants to know whether it worked.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: response, error } = await supabase
    .from("responses")
    // One literal, not a concatenation: supabase-js infers the row type from
    // the select string itself, and a joined expression infers as nothing.
    .select(
      "id, survey_id, respondent_name, respondent_email, respondent_phone, custom_field_values, lead_score, pain_points, call_script, completed, is_test, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  // Both of these mirror the completion path's own rules: an unfinished
  // interview has no score or script worth pushing, and a test run is not a
  // lead. Reported rather than silently succeeded so the button can say why.
  if (!response.completed) {
    return NextResponse.json(
      { status: "skipped", reason: "This interview has not finished yet." },
      { status: 409 }
    );
  }
  if (response.is_test) {
    return NextResponse.json(
      { status: "skipped", reason: "Test responses are not synced to HubSpot." },
      { status: 409 }
    );
  }

  const { data: survey } = await supabase
    .from("surveys")
    .select("title")
    .eq("id", response.survey_id)
    .maybeSingle();

  const result = await syncResponseToHubSpot({
    supabase,
    responseId: response.id,
    surveyTitle: survey?.title ?? "Birdsong interview",
    respondentName: response.respondent_name,
    respondentEmail: response.respondent_email,
    respondentPhone: response.respondent_phone,
    company: selectRespondentCompanyName(
      response.custom_field_values as Record<string, unknown> | null
    ),
    leadScore: response.lead_score,
    painPoints: (response.pain_points as unknown as string[] | null) ?? [],
    callScript: parseCallScript(response.call_script),
    // No completion timestamp is stored on the row, so a re-sync dates the
    // interview by when it was created. Off by however long the interview
    // ran, which for a date-granularity property is almost always the same
    // day, and never wrong by more than one.
    completedAt: response.created_at,
  });

  if (result.status === "failed") {
    return NextResponse.json({ status: "failed", error: result.error }, { status: 502 });
  }
  if (result.status === "skipped") {
    return NextResponse.json({ status: "skipped", reason: result.reason }, { status: 409 });
  }

  return NextResponse.json({
    status: "synced",
    contactId: result.contactId,
    dealId: result.dealId,
    syncedAt: new Date().toISOString(),
  });
}
