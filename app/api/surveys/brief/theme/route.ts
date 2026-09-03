import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lexicalFailures, themeFailures } from "@/lib/brief/critic";
import { regenerateTheme } from "@/lib/brief/generate";
import { loadProfileContext } from "@/lib/brief/profile";
import { getActiveOrg, orgErrorResponse, requireOrgPermission } from "@/lib/org";
import type { ExtractedBrief } from "@/lib/brief/types";
import { isStructuredGuide, type StructuredGuide } from "@/lib/surveys/guide";

// POST /api/surveys/brief/theme
// Body: { brief, guide, index }
// Admin-only. Redrafts one theme in place, for the review step's per-theme
// regenerate. The whole guide comes along so the redraft can be told what
// the other themes already cover and cannot land on top of one of them.
//
// The redraft is re-checked lexically before it is returned. That is the
// deterministic half of the critic only, not the model pass: this runs on a
// button press with the admin waiting, and the flags it produces are shown
// on the theme either way.
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

  let body: { brief?: ExtractedBrief; guide?: StructuredGuide; index?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brief, guide, index } = body;
  if (!brief || !isStructuredGuide(guide) || typeof index !== "number") {
    return NextResponse.json({ error: "brief, guide and index are required" }, { status: 400 });
  }
  if (index < 0 || index >= guide.themes.length) {
    return NextResponse.json({ error: "No such theme" }, { status: 400 });
  }

  const org = await getActiveOrg();
  const profile = org ? await loadProfileContext(supabase, org.orgId) : null;

  try {
    const theme = await regenerateTheme({ brief, profile, guide, index });

    const flags = [
      ...themeFailures(theme),
      ...lexicalFailures(theme.opening_question, "opening").map((f) => `opening: ${f}`),
      ...theme.probes.flatMap((p) => lexicalFailures(p, "probe").map((f) => `probe: ${f}`)),
      ...lexicalFailures(theme.quantification_probe, "quantification").map(
        (f) => `quantification: ${f}`
      ),
    ];

    return NextResponse.json({ theme: { ...theme, flags: flags.length > 0 ? flags : undefined } });
  } catch {
    return NextResponse.json({ error: "Couldn't redraft that theme. Try again." }, { status: 502 });
  }
}
