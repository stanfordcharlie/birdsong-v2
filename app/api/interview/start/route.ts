import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import { buildInterviewSystemPrompt, buildKickoffMessage } from "@/lib/interview-prompt";
import { parseChips } from "@/lib/interview/chips";
import { generateSessionToken } from "@/lib/interview/token";
import { getClientIp, isRateLimited, startRateLimiter } from "@/lib/interview/rate-limit";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  isValidEmail,
  sanitizeCustomFieldValues,
  truncate,
} from "@/lib/interview/validation";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Json } from "@/types/database";

// POST /api/interview/start
// Body: { survey_id, respondent_name?, respondent_email?, respondent_phone?, custom_field_values? }
// Creates a `responses` row (unauthenticated, public) and returns the first
// interview message from Claude.
//
// CAPTCHA (e.g. Turnstile/hCaptcha) would slot in right here, verified
// before the rate-limit check below even runs — not added in this pass.
export async function POST(request: Request) {
  let body: {
    survey_id?: string;
    respondent_name?: string;
    respondent_email?: string;
    respondent_phone?: string;
    custom_field_values?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { survey_id, respondent_phone, custom_field_values } = body;

  if (!survey_id || typeof survey_id !== "string") {
    return NextResponse.json({ error: "survey_id is required" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  if (await isRateLimited(startRateLimiter, clientIp)) {
    return NextResponse.json(
      { error: "Too many interviews started from this connection, please try again in a bit." },
      { status: 429 }
    );
  }

  const respondent_name =
    typeof body.respondent_name === "string" ? truncate(body.respondent_name.trim(), NAME_MAX_LENGTH) : undefined;

  const respondent_email =
    typeof body.respondent_email === "string" ? truncate(body.respondent_email.trim(), EMAIL_MAX_LENGTH) : undefined;

  if (respondent_email && !isValidEmail(respondent_email)) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }

  const sanitizedCustomFieldValues = sanitizeCustomFieldValues(custom_field_values);

  console.log(`[interview/start] survey_id=${survey_id} respondent_email=${respondent_email ?? "none"}`);

  const supabase = createAdminClient();

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", survey_id)
    .maybeSingle();

  if (surveyError) {
    console.error("[interview/start] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    console.error(`[interview/start] survey not found for id=${survey_id}`);
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Defense in depth: the public survey page already gates on this, but
  // this endpoint is directly callable and must not trust that a caller
  // came through the gated page. Checked before any Anthropic call or
  // responses row is created, so a draft survey never burns tokens or
  // pollutes the lead queue.
  if (survey.status !== "live") {
    console.error(`[interview/start] survey_id=${survey_id} is not live (status=${survey.status})`);
    return NextResponse.json({ error: "This survey isn't available" }, { status: 403 });
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

  const respondent = {
    name: respondent_name ?? null,
    customFieldValues: sanitizedCustomFieldValues,
  };

  const anthropic = getAnthropicClient();
  const systemPrompt = buildInterviewSystemPrompt({
    survey,
    companyProfile: profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null,
    respondent,
    exchangeCount: 1,
    totalMessageCount: 1,
  });

  const completion = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: buildKickoffMessage(respondent) }],
  });

  const rawOpeningQuestion = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!rawOpeningQuestion) {
    return NextResponse.json({ error: "Failed to generate opening question" }, { status: 502 });
  }

  const { text: openingQuestion, chips } = parseChips(rawOpeningQuestion);

  const messages: InterviewMessage[] = [{ role: "assistant", content: openingQuestion }];

  // Bound to this row and required on every /api/interview/continue call
  // from here on, so a guessable response_id UUID alone is never enough to
  // post messages into someone else's interview.
  const sessionToken = generateSessionToken();

  const { data: response, error: insertError } = await supabase
    .from("responses")
    .insert({
      survey_id,
      respondent_name: respondent_name ?? null,
      respondent_email: respondent_email ?? null,
      respondent_phone: respondent_phone ?? null,
      custom_field_values: sanitizedCustomFieldValues as Json,
      messages: messages as unknown as Json,
      session_token: sessionToken,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[interview/start] responses insert failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log(`[interview/start] created response_id=${response.id} for survey_id=${survey_id}`);

  return NextResponse.json({
    response_id: response.id,
    message: openingQuestion,
    chips,
    token: sessionToken,
  });
}
