import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import {
  buildInterviewSystemPrompt,
  KICKOFF_MESSAGE,
  CLOSING_MESSAGE,
  COMPLETE_TOKEN,
  MAX_EXCHANGES,
} from "@/lib/interview-prompt";
import { extractInterviewInsights } from "@/lib/interview/extract";
import { runCompanyFitScoring } from "@/lib/interview/company-fit";
import { parseChips } from "@/lib/interview/chips";
import { tokensMatch } from "@/lib/interview/token";
import {
  continueIpRateLimiter,
  continueResponseRateLimiter,
  getClientIp,
  isRateLimited,
} from "@/lib/interview/rate-limit";
import { MESSAGE_MAX_LENGTH } from "@/lib/interview/validation";
import { sendLeadNotification } from "@/lib/email/lead-notification";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Database, Json } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;
type Survey = Database["public"]["Tables"]["surveys"]["Row"];
type ResponseRow = Database["public"]["Tables"]["responses"]["Row"];

// POST /api/interview/continue
// Body: { response_id, message }
// Appends the respondent's message, calls Claude for the next turn (or to
// wrap up + score the lead once the interview is complete), and persists
// the updated transcript.
export async function POST(request: Request) {
  let body: { response_id?: string; message?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { response_id, message, token } = body;

  if (!response_id || typeof response_id !== "string") {
    return NextResponse.json({ error: "response_id is required" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json(
      { error: "That message is a bit long, try trimming it down." },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const [ipLimited, responseLimited] = await Promise.all([
    isRateLimited(continueIpRateLimiter, clientIp),
    isRateLimited(continueResponseRateLimiter, response_id),
  ]);
  if (ipLimited || responseLimited) {
    return NextResponse.json(
      { error: "You're sending messages a bit too fast, give it a moment." },
      { status: 429 }
    );
  }

  console.log(`[interview/continue] response_id=${response_id}`);

  const supabase = createAdminClient();

  const { data: response, error: fetchError } = await supabase
    .from("responses")
    .select("*")
    .eq("id", response_id)
    .maybeSingle();

  if (fetchError) {
    console.error("[interview/continue] responses fetch failed:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!response) {
    console.error(`[interview/continue] response not found for id=${response_id}`);
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  // response_id is a guessable/enumerable UUID, not a credential — the
  // session token minted at /api/interview/start is what actually proves
  // this caller owns this interview. Checked before the completed/exchange
  // logic below runs.
  if (!token || typeof token !== "string" || !response.session_token || !tokensMatch(token, response.session_token)) {
    console.error(`[interview/continue] response_id=${response_id} invalid or missing session token`);
    return NextResponse.json({ error: "This interview session is no longer valid." }, { status: 401 });
  }

  if (response.completed) {
    console.error(`[interview/continue] response_id=${response_id} already completed`);
    return NextResponse.json({ error: "This interview has already ended" }, { status: 409 });
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", response.survey_id)
    .maybeSingle();

  if (surveyError) {
    console.error("[interview/continue] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    console.error(`[interview/continue] survey not found for id=${response.survey_id}`);
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Deliberately no survey.status check here: unlike start, an interview
  // already in flight must finish even if the owner flips the survey to
  // draft mid-conversation — only new starts and the public page are gated.

  const history = (response.messages as unknown as InterviewMessage[] | null) ?? [];
  const updatedHistory: InterviewMessage[] = [...history, { role: "user", content: message }];

  // The exchange count is enforced here rather than trusted to the model:
  // it's a hard limit, so we stop calling Claude for new questions once hit
  // instead of relying on the system prompt alone.
  const exchangeCount = updatedHistory.filter((m) => m.role === "user").length;
  if (exchangeCount >= MAX_EXCHANGES) {
    return completeInterview(supabase, response_id, updatedHistory, survey, response);
  }

  // Survey owner's company profile (what they sell, target ICP, value
  // prop), used to keep the interview anchored to the company's actual
  // product surface area instead of drifting wherever the respondent's
  // last answer leads.
  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", survey.user_id)
    .maybeSingle();

  const anthropic = getAnthropicClient();
  const systemPrompt = buildInterviewSystemPrompt({
    survey,
    companyProfile: profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null,
    respondent: {
      name: response.respondent_name,
      customFieldValues: (response.custom_field_values as Record<string, unknown> | null) ?? {},
    },
    exchangeCount,
    // Total messages.length so far (both roles), for the exchange-budget
    // line — distinct from exchangeCount above, which counts only user
    // turns and drives the existing MAX_EXCHANGES hard-cap rule.
    totalMessageCount: updatedHistory.length,
  });

  const claudeMessages: Anthropic.MessageParam[] = [
    { role: "user", content: KICKOFF_MESSAGE },
    ...updatedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const completion = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: claudeMessages,
  });

  const rawReply = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!rawReply) {
    return NextResponse.json({ error: "Failed to generate the next question" }, { status: 502 });
  }

  // The model is instructed to reply with exactly this token, but it
  // sometimes wraps it in a closing sentence anyway; matching on inclusion
  // (rather than equality) keeps a stray sentinel from leaking into the
  // respondent-facing transcript. Checked against the raw reply, before
  // chip parsing, since the prompt also tells the model never to attach a
  // chip block to this message.
  if (rawReply.includes(COMPLETE_TOKEN)) {
    return completeInterview(supabase, response_id, updatedHistory, survey, response);
  }

  const { text: reply, chips } = parseChips(rawReply);

  const finalHistory: InterviewMessage[] = [
    ...updatedHistory,
    { role: "assistant", content: reply },
  ];

  const { error: updateError } = await supabase
    .from("responses")
    .update({ messages: finalHistory as unknown as Json })
    .eq("id", response_id);

  if (updateError) {
    console.error("[interview/continue] responses update failed:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[interview/continue] response_id=${response_id} exchange=${exchangeCount} persisted`);

  return NextResponse.json({
    response_id,
    message: reply,
    complete: false,
    chips,
  });
}

async function completeInterview(
  supabase: AdminClient,
  responseId: string,
  history: InterviewMessage[],
  survey: Survey,
  response: ResponseRow
) {
  // Survey owner's company profile (what they sell, target ICP, value
  // prop), used here to keep the lead score and call script anchored to
  // fit against this sponsor's actual product, not generic friction.
  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", survey.user_id)
    .maybeSingle();

  const { painPoints, leadScore, fitReason, summary, callScript, signals } = await extractInterviewInsights(
    history,
    profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null
  );

  const { error: updateError } = await supabase
    .from("responses")
    .update({
      messages: history as unknown as Json,
      completed: true,
      pain_points: painPoints as unknown as Json,
      lead_score: leadScore,
      fit_reason: fitReason,
      summary,
      call_script: { opener: callScript.opener, talking_points: callScript.talkingPoints } as unknown as Json,
      signals: {
        economic_buyer: signals.economicBuyer,
        decision_criteria: signals.decisionCriteria,
        decision_process: signals.decisionProcess,
        metrics: signals.metrics,
        champion: signals.champion,
      } as unknown as Json,
    })
    .eq("id", responseId);

  if (updateError) {
    console.error("[interview/continue] completion update failed:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[interview/continue] response_id=${responseId} completed, lead_score=${leadScore}`);

  // Test runs still go through extraction above (the owner wants to see
  // real scores and call scripts for their dry runs) but never notify —
  // the email is the "new lead" signal and a test is not a lead.
  if (response.is_test) {
    console.log(`[interview/continue] response_id=${responseId} is a test run; skipping lead notification`);
    return NextResponse.json({
      response_id: responseId,
      message: CLOSING_MESSAGE,
      complete: true,
    });
  }

  // Best-effort: the respondent's completion shouldn't fail because the
  // notification email did.
  try {
    const { data: ownerData } = await supabase.auth.admin.getUserById(survey.user_id);
    const ownerEmail = ownerData?.user?.email;
    if (ownerEmail) {
      await sendLeadNotification({
        survey: { id: survey.id, title: survey.title },
        respondentName: response.respondent_name,
        respondentEmail: response.respondent_email,
        leadScore,
        fitReason,
        painPoints,
        ownerEmail,
      });
    } else {
      console.error(`No email on file for survey owner ${survey.user_id}; skipping notification`);
    }
  } catch (err) {
    console.error("Failed to send lead notification email", err);
  }

  // Company fit-scoring: a separate, slower/costlier agent (it runs web
  // search) that scores the respondent's COMPANY against the sponsor's ICP,
  // distinct from the transcript-based lead_score above. It must never block
  // completion or the notification, so it runs fire-and-forget via waitUntil
  // — the response returns now; this finishes in the background and writes
  // its own columns. Failures are fully contained inside runCompanyFitScoring
  // (loud logs + an "unavailable" marker), never surfacing here. Not run for
  // test responses (this branch is already the non-test path).
  const respondentCustomValues =
    (response.custom_field_values as Record<string, unknown> | null) ?? {};
  const respondentCompanyName =
    typeof respondentCustomValues.company === "string"
      ? respondentCustomValues.company
      : typeof respondentCustomValues.derived_company_name === "string"
        ? respondentCustomValues.derived_company_name
        : null;
  const respondentEmailDomain =
    typeof respondentCustomValues.email_domain === "string" ? respondentCustomValues.email_domain : null;
  waitUntil(
    runCompanyFitScoring({
      responseId,
      sponsorUserId: survey.user_id,
      company: { name: respondentCompanyName, domain: respondentEmailDomain },
    })
  );

  return NextResponse.json({
    response_id: responseId,
    message: CLOSING_MESSAGE,
    complete: true,
  });
}
