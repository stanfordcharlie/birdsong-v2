import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireOrgPermission } from "@/lib/org";
import { generateSurveyReport } from "@/lib/report/generate";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Json } from "@/types/database";

// 300s is the ceiling Vercel allows by default on every plan. The generation
// itself measures well under a minute for a 16-interview study (roughly 28k
// tokens in, 5k out), so this is headroom for a retry plus a slow upstream,
// not an expectation.
export const maxDuration = 300;

/**
 * What the admin is allowed to see. Upstream messages can carry a request id
 * or an echoed fragment of the request, so anything key-shaped is stripped
 * and the text is capped: the point is a specific, actionable sentence, not
 * a stack trace in a toast.
 */
function clientSafeMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const scrubbed = raw.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]");
  return scrubbed.length > 300 ? `${scrubbed.slice(0, 297)}...` : scrubbed;
}

// POST /api/surveys/[id]/report
// Generates a thought-leadership report draft from this survey's completed
// non-test interviews and stores it. Cookie-authenticated; every query in
// here runs through the caller's own RLS-scoped session, no admin client.
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
    ({ orgId } = await requireOrgPermission("report:generate"));
  } catch (err) {
    return orgErrorResponse(err);
  }

  // surveys_public_read means RLS alone won't hide other organizations'
  // surveys, so the org is an explicit filter — a survey that isn't this
  // org's 404s indistinguishably from one that doesn't exist.
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, title, topic, question_guide")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (surveyError) {
    console.error("[surveys/report] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const { data: responses, error: responsesError } = await supabase
    .from("responses")
    .select("messages, created_at")
    .eq("survey_id", id)
    .eq("completed", true)
    .eq("is_test", false)
    .order("created_at", { ascending: false });

  if (responsesError) {
    console.error("[surveys/report] responses fetch failed:", responsesError);
    return NextResponse.json({ error: responsesError.message }, { status: 500 });
  }

  const transcripts = (responses ?? []).map((r) => ({
    messages: (r.messages as unknown as InterviewMessage[] | null) ?? [],
    createdAt: r.created_at,
  }));

  if (transcripts.length < 3) {
    return NextResponse.json(
      { error: "Reports need at least 3 completed interviews" },
      { status: 400 }
    );
  }

  // The organization's profile row — cookie client is enough, no RLS
  // boundary to cross here. Same three fields the interview prompt builder
  // uses.
  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("org_id", orgId)
    .maybeSingle();

  let content;
  try {
    content = await generateSurveyReport(
      { topic: survey.topic, title: survey.title, questionGuide: survey.question_guide },
      transcripts,
      profile
        ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
        : null
    );
  } catch (err) {
    console.error(`[surveys/report] generation failed for survey_id=${id}:`, err);
    return NextResponse.json({ error: clientSafeMessage(err) }, { status: 502 });
  }

  const { data: report, error: insertError } = await supabase
    .from("survey_reports")
    .insert({
      survey_id: id,
      user_id: user.id,
      org_id: orgId,
      content: content as unknown as Json,
      respondent_count: transcripts.length,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error(`[surveys/report] insert failed for survey_id=${id}:`, insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log(
    `[surveys/report] generated report ${report.id} for survey_id=${id} from ${transcripts.length} interviews`
  );

  return NextResponse.json({ report });
}
