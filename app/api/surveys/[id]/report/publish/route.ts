import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireOrgPermission } from "@/lib/org";
import { REPORTS_CACHE_TAG } from "@/lib/reports/public";

/**
 * POST /api/surveys/[id]/report/publish
 *
 * Sets both gates for a study's latest report in one call:
 *   published      — on survey_reports, the report itself
 *   publish_public — on surveys, consent for the public library
 *
 * Cookie-authenticated and org-filtered, like the generation route next to
 * it. Every write runs through the caller's own RLS-scoped session, so a
 * caller can only ever publish a study their organization owns.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let orgId: string;
  try {
    ({ orgId } = await requireOrgPermission("report:publish"));
  } catch (err) {
    return orgErrorResponse(err);
  }

  let body: { publicLibrary?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.publicLibrary !== "boolean") {
    return NextResponse.json({ error: "publicLibrary must be a boolean." }, { status: 400 });
  }
  const publicLibrary = body.publicLibrary;

  // surveys_public_read means RLS alone won't scope this to the caller, so
  // the org is an explicit filter — same pattern as the report generation
  // route.
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, slug")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (surveyError) {
    console.error("[report/publish] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  // Regeneration inserts a new row, so the study's current report is the
  // newest one. Only that row is published; older drafts stay unpublished.
  const { data: report, error: reportError } = await supabase
    .from("survey_reports")
    .select("id")
    .eq("survey_id", id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    console.error("[report/publish] report lookup failed:", reportError);
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }
  if (!report) {
    return NextResponse.json({ error: "Generate a report first." }, { status: 400 });
  }

  const { error: updateReportError } = await supabase
    .from("survey_reports")
    .update({
      published: publicLibrary,
      // Set once, on first publish, and left alone afterwards: the library
      // orders by this, and re-toggling the switch should not reorder a
      // study that published weeks ago.
      ...(publicLibrary ? { published_at: new Date().toISOString() } : {}),
    })
    .eq("id", report.id);

  if (updateReportError) {
    console.error("[report/publish] report update failed:", updateReportError);
    return NextResponse.json({ error: updateReportError.message }, { status: 500 });
  }

  const { error: updateSurveyError } = await supabase
    .from("surveys")
    .update({ publish_public: publicLibrary })
    .eq("id", id)
    .eq("org_id", orgId);

  if (updateSurveyError) {
    console.error("[report/publish] survey update failed:", updateSurveyError);
    return NextResponse.json({ error: updateSurveyError.message }, { status: 500 });
  }

  // Push the change to the static library immediately rather than waiting
  // out the hourly revalidate. The report path is revalidated in both
  // directions so un-publishing takes effect just as fast as publishing.
  //
  // The tag comes first and matters most: revalidatePath rebuilds the pages,
  // but the Supabase reads inside them are themselves cached, so without
  // dropping the tag those pages rebuild from the same stale rows.
  revalidateTag(REPORTS_CACHE_TAG);
  revalidatePath("/reports");
  revalidatePath(`/reports/${survey.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/");

  return NextResponse.json({ ok: true, publicLibrary });
}
