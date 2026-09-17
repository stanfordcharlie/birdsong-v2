import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireOrgPermission } from "@/lib/org";
import { randomSlugSuffix } from "@/lib/surveys/slugify";
import { SAMPLE_SURVEY, SAMPLE_RESPONSES } from "@/lib/sample-data";
import type { Json } from "@/types/database";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// POST /api/sample-data
// Seeds the demo survey + responses for the current organization from the
// lib/sample-data fixture. Instant and deterministic — no model calls.
// Idempotent: if the org already has sample data, returns it untouched.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let orgId: string;
  try {
    ({ orgId } = await requireOrgPermission("study:create"));
  } catch (err) {
    return orgErrorResponse(err);
  }

  const { data: existing } = await supabase
    .from("surveys")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_sample", true)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ survey_id: existing.id, already_existed: true });
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .insert({
      ...SAMPLE_SURVEY,
      custom_fields: SAMPLE_SURVEY.custom_fields as unknown as Json,
      // Draft forever: the sample survey must never be publicly answerable.
      status: "draft",
      is_sample: true,
      slug: `sample-field-ops-${randomSlugSuffix()}`,
      user_id: user.id,
      org_id: orgId,
    })
    .select("id")
    .single();

  if (surveyError) {
    console.error("[sample-data] survey insert failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }

  const rows = SAMPLE_RESPONSES.map((r) => ({
    survey_id: survey.id,
    respondent_name: r.respondent_name,
    respondent_email: r.respondent_email,
    custom_field_values: r.custom_field_values as unknown as Json,
    messages: r.messages as unknown as Json,
    completed: r.completed,
    lead_score: r.lead_score,
    summary: r.summary,
    fit_reason: r.fit_reason,
    pain_points: r.pain_points as unknown as Json,
    call_script: r.call_script as unknown as Json,
    signals: r.signals as unknown as Json,
    // Always test data: excluded from real stats, never emails, never a lead.
    is_test: true,
    // user_id and org_id are both derived from the survey by the
    // set_response_user_id / set_response_org_id triggers; this value is
    // overwritten and only kept for the Insert type.
    user_id: user.id,
    created_at: daysAgoIso(r.daysAgo),
  }));

  const { error: responsesError } = await supabase.from("responses").insert(rows);

  if (responsesError) {
    console.error("[sample-data] responses insert failed:", responsesError);
    // Don't leave a half-seeded demo behind.
    await supabase.from("surveys").delete().eq("id", survey.id).eq("is_sample", true);
    return NextResponse.json({ error: responsesError.message }, { status: 500 });
  }

  console.log(`[sample-data] seeded survey ${survey.id} for org ${orgId} (by user ${user.id})`);
  return NextResponse.json({ survey_id: survey.id, already_existed: false });
}

// DELETE /api/sample-data
// Removes the current organization's sample data. Scoped strictly to
// is_sample surveys owned by the caller's org; responses go with them via
// the existing responses.survey_id ON DELETE CASCADE. Real data is
// unreachable from this path by construction.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let orgId: string;
  try {
    ({ orgId } = await requireOrgPermission("study:delete"));
  } catch (err) {
    return orgErrorResponse(err);
  }

  const { data: deleted, error } = await supabase
    .from("surveys")
    .delete()
    .eq("org_id", orgId)
    .eq("is_sample", true)
    .select("id");

  if (error) {
    console.error("[sample-data] delete failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[sample-data] removed ${deleted?.length ?? 0} sample survey(s) for org ${orgId}`);
  return NextResponse.json({ removed: deleted?.length ?? 0 });
}
