import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCriticPass } from "@/lib/brief/critic";
import { generateGuide } from "@/lib/brief/generate";
import { loadProfileContext } from "@/lib/brief/profile";
import { getActiveOrg, orgErrorResponse, requireOrgPermission } from "@/lib/org";
import type { ExtractedBrief } from "@/lib/brief/types";

// POST /api/surveys/brief/guide
// Body: { brief }
// Admin-only. Drafts the structured guide from the brief, then runs the
// mandatory critic pass over it. What comes back has already been reviewed
// and, where a question failed, redrafted once; anything still failing is
// carried on the theme's `flags` so the review step can show it rather than
// shipping it quietly.
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

  let body: { brief?: ExtractedBrief };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const brief = body.brief;
  if (!brief || typeof brief !== "object") {
    return NextResponse.json({ error: "brief is required" }, { status: 400 });
  }

  const org = await getActiveOrg();
  const profile = org ? await loadProfileContext(supabase, org.orgId) : null;

  try {
    const draft = await generateGuide({ brief, profile });
    const { guide, report } = await runCriticPass({ brief, profile, guide: draft });
    return NextResponse.json({ guide, report });
  } catch {
    return NextResponse.json({ error: "Couldn't draft the guide. Try again." }, { status: 502 });
  }
}
