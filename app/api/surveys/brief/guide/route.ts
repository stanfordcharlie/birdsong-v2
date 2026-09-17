import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCriticPass } from "@/lib/brief/critic";
import { generateGuide } from "@/lib/brief/generate";
import { loadProfileContext } from "@/lib/brief/profile";
import { getActiveOrg, requireOrgPermission } from "@/lib/org";
import type { ExtractedBrief } from "@/lib/brief/types";
import {
  BRIEF_REQUIRED_ENV,
  briefLog,
  errorResponse,
  fail,
  missingEnv,
  newRequestId,
} from "@/lib/brief/route-utils";

// POST /api/surveys/brief/guide
// Body: { brief }
// Admin-only. Drafts the structured guide from the brief, then runs the
// mandatory critic pass over it. What comes back has already been reviewed
// and, where a question failed, redrafted once; anything still failing is
// carried on the theme's `flags` so the review step can show it rather than
// shipping it quietly.
//
// Same wrapper as brief/continue: one try around the whole body, every
// failure a typed { error, code, requestId } with its real status, and the
// request id on every log line. Generation plus the critic pass is several
// model calls, so this takes the full Hobby ceiling.

export const runtime = "nodejs";
export const maxDuration = 60;

const SCOPE = "brief/guide";

export async function POST(request: Request) {
  const requestId = newRequestId();
  const startedAt = Date.now();
  const phase = { current: "init" };

  let response: NextResponse;
  try {
    response = await handle(request, requestId, phase);
  } catch (err) {
    response = errorResponse(SCOPE, requestId, phase.current, err);
  }
  briefLog(SCOPE, requestId, "exit", { status: response.status, durationMs: Date.now() - startedAt });
  return response;
}

async function handle(request: Request, requestId: string, phase: { current: string }): Promise<NextResponse> {
  phase.current = "env";
  const missing = missingEnv(BRIEF_REQUIRED_ENV);
  if (missing) {
    briefLog(SCOPE, requestId, "missing_env", { name: missing });
    return fail(requestId, 500, "MISSING_ENV", `The server is missing its ${missing} setting.`);
  }

  phase.current = "auth";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail(requestId, 401, "UNAUTHENTICATED", "You are not signed in.");
  }

  try {
    await requireOrgPermission("study:create");
  } catch (err) {
    return errorResponse(SCOPE, requestId, "permission", err);
  }

  phase.current = "body";
  let body: { brief?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(requestId, 400, "BAD_JSON", "The request body was not valid JSON.");
  }

  const brief = body?.brief;
  if (!brief || typeof brief !== "object") {
    return fail(requestId, 400, "BAD_BRIEF", "brief is required.");
  }
  briefLog(SCOPE, requestId, "entry", {
    userId: user.id,
    briefChars: JSON.stringify(brief).length,
  });

  phase.current = "profile";
  const org = await getActiveOrg();
  let profile = null;
  try {
    profile = org ? await loadProfileContext(supabase, org.orgId) : null;
  } catch (err) {
    briefLog(SCOPE, requestId, "profile_unavailable", { message: String(err instanceof Error ? err.message : err) });
  }

  phase.current = "generate";
  try {
    const draft = await generateGuide({ brief: brief as ExtractedBrief, profile });
    briefLog(SCOPE, requestId, "drafted", { themes: draft.themes.length });
    phase.current = "critic";
    const { guide, report } = await runCriticPass({ brief: brief as ExtractedBrief, profile, guide: draft });
    briefLog(SCOPE, requestId, "reviewed", { themes: guide.themes.length });
    return NextResponse.json({ guide, report, requestId });
  } catch (err) {
    return errorResponse(SCOPE, requestId, phase.current, err);
  }
}
