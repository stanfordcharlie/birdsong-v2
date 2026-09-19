import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lexicalFailures, themeFailures } from "@/lib/brief/critic";
import { regenerateTheme } from "@/lib/brief/generate";
import { loadProfileContext } from "@/lib/brief/profile";
import { getActiveOrg, requireOrgPermission } from "@/lib/org";
import type { ExtractedBrief } from "@/lib/brief/types";
import { isStructuredGuide, type StructuredGuide } from "@/lib/studies/guide";
import {
  BRIEF_REQUIRED_ENV,
  briefLog,
  errorResponse,
  fail,
  missingEnv,
  newRequestId,
} from "@/lib/brief/route-utils";

// POST /api/surveys/brief/theme
// Body: { brief, guide, index, failures? }
// Admin-only. Redrafts one theme in place, for the review step's per-theme
// regenerate. The whole guide comes along so the redraft can be told what
// the other themes already cover and cannot land on top of one of them.
// `failures` is the theme's current flags, when it has any, so a redraft
// asked for from the banner knows the objection it is meant to clear.
//
// The redraft is re-checked lexically before it is returned. That is the
// deterministic half of the critic only, not the model pass: this runs on a
// button press with the admin waiting, and the flags it produces are shown
// on the theme either way.
//
// Same wrapper as brief/continue: typed errors with real statuses, and the
// request id on every log line.

export const runtime = "nodejs";
export const maxDuration = 60;

const SCOPE = "brief/theme";

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
  let body: { brief?: unknown; guide?: unknown; index?: unknown; failures?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(requestId, 400, "BAD_JSON", "The request body was not valid JSON.");
  }

  const { brief, guide, index } = body ?? {};
  const failures = Array.isArray(body?.failures)
    ? body.failures.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    : [];
  if (!brief || typeof brief !== "object" || !isStructuredGuide(guide) || typeof index !== "number") {
    return fail(requestId, 400, "BAD_THEME_REQUEST", "brief, guide and index are required.");
  }
  if (!Number.isInteger(index) || index < 0 || index >= guide.themes.length) {
    return fail(requestId, 400, "NO_SUCH_THEME", "That theme does not exist in this guide.");
  }
  briefLog(SCOPE, requestId, "entry", { userId: user.id, index, themes: guide.themes.length, failures });

  phase.current = "profile";
  const org = await getActiveOrg();
  let profile = null;
  try {
    profile = org ? await loadProfileContext(supabase, org.orgId) : null;
  } catch (err) {
    briefLog(SCOPE, requestId, "profile_unavailable", { message: String(err instanceof Error ? err.message : err) });
  }

  phase.current = "regenerate";
  try {
    const theme = await regenerateTheme({
      brief: brief as ExtractedBrief,
      profile,
      guide: guide as StructuredGuide,
      index,
      failures: failures.length > 0 ? failures : undefined,
    });

    const flags = [
      ...themeFailures(theme),
      ...lexicalFailures(theme.opening_question, "opening").map((f) => `opening: ${f}`),
      ...theme.probes.flatMap((p) => lexicalFailures(p, "probe").map((f) => `probe: ${f}`)),
      ...lexicalFailures(theme.quantification_probe, "quantification").map(
        (f) => `quantification: ${f}`
      ),
    ];
    briefLog(SCOPE, requestId, "redrafted", { flags: flags.length });

    return NextResponse.json({
      theme: { ...theme, flags: flags.length > 0 ? flags : undefined },
      requestId,
    });
  } catch (err) {
    return errorResponse(SCOPE, requestId, "regenerate", err);
  }
}
