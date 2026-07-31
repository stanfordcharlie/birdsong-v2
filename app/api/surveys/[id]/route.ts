import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/surveys/[id]
// Body: { action: "archive" | "unarchive" }
// Archive/unarchive is reversible: just sets or clears archived_at. Cookie
// session only, and ownership is an explicit filter on every query (same
// reasoning as the report route: surveys_public_read means RLS alone won't
// hide other owners' surveys), so a survey that isn't the caller's 404s
// indistinguishably from one that doesn't exist. Never touches responses.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "archive" && body.action !== "unarchive") {
    return NextResponse.json({ error: "action must be \"archive\" or \"unarchive\"" }, { status: 400 });
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (surveyError) {
    console.error("[surveys/[id] PATCH] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("surveys")
    .update({ archived_at: body.action === "archive" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, archived_at")
    .single();

  if (updateError) {
    console.error("[surveys/[id] PATCH] update failed:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ survey: updated });
}

// DELETE /api/surveys/[id]
// Hard-deletes the survey row. Only ever allowed when the survey has zero
// real (non-test) responses — checked here independently of whatever the
// UI already gated on, since this is irreversible. responses.survey_id has
// on delete cascade (see init migration), so any leftover test-run rows go
// with it; real responses blocking the delete is exactly the case this
// checks for.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (surveyError) {
    console.error("[surveys/[id] DELETE] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const { count, error: countError } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", id)
    .eq("is_test", false);

  if (countError) {
    console.error("[surveys/[id] DELETE] response count failed:", countError);
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if (count && count > 0) {
    return NextResponse.json(
      { error: "This survey has responses and can't be permanently deleted. Archive it instead." },
      { status: 409 }
    );
  }

  const { error: deleteError } = await supabase
    .from("surveys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[surveys/[id] DELETE] delete failed:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  console.log(`[surveys/[id] DELETE] permanently deleted survey_id=${id}`);

  return NextResponse.json({ deleted: true });
}
