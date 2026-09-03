import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg, orgErrorResponse, requireOrgPermission } from "@/lib/org";
import { suggestSurveyNames } from "@/lib/survey-onboarding/suggest";
import type { ExtractedSurveyDetails } from "@/lib/survey-onboarding/types";

// POST /api/surveys/suggest-names
// Body: { details }
// Admin-only. Generates 3 research-styled survey title suggestions from the
// survey details already captured in the wizard plus the admin's company
// industry. A bonus, not a blocker: any failure here should leave the wizard
// on a plain, fully usable input, which is enforced client-side, not here.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await requireOrgPermission("study:create");
  } catch (err) {
    return orgErrorResponse(err);
  }

  let body: { details?: ExtractedSurveyDetails };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.details) {
    return NextResponse.json({ error: "details is required" }, { status: 400 });
  }

  const org = await getActiveOrg();
  const { data: profile } = org
    ? await supabase.from("profiles").select("industry").eq("org_id", org.orgId).maybeSingle()
    : { data: null };

  try {
    const titles = await suggestSurveyNames(body.details, profile?.industry ?? null);
    return NextResponse.json({ titles });
  } catch (err) {
    console.error("[api/surveys/suggest-names] failed", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 502 });
  }
}
