import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestSurveyDescription } from "@/lib/survey-onboarding/suggest";
import type { ExtractedSurveyDetails } from "@/lib/survey-onboarding/types";

// POST /api/surveys/suggest-description
// Body: { details, externalTitle }
// Admin-only. Generates one suggested public description from the survey
// details plus the actual chosen external name (which may be hand-typed,
// not one of the name suggestions) — run only after the name step, per the
// design handoff, since the description should match whatever title the
// admin actually settled on.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { details?: ExtractedSurveyDetails; externalTitle?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.details || !body.externalTitle?.trim()) {
    return NextResponse.json({ error: "details and externalTitle are required" }, { status: 400 });
  }

  try {
    const description = await suggestSurveyDescription(body.details, body.externalTitle);
    return NextResponse.json({ description });
  } catch (err) {
    console.error("[api/surveys/suggest-description] failed", err);
    return NextResponse.json({ error: "Failed to generate a suggestion" }, { status: 502 });
  }
}
