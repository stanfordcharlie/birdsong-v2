import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import { buildInterviewSystemPrompt, KICKOFF_MESSAGE } from "@/lib/interview/prompt";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Json } from "@/types/database";

// POST /api/interview/start
// Body: { survey_id, respondent_name?, respondent_email?, respondent_phone?, custom_field_values? }
// Creates a `responses` row (unauthenticated, public) and returns the first
// interview message from Claude.
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

  const { survey_id, respondent_name, respondent_email, respondent_phone, custom_field_values } =
    body;

  if (!survey_id || typeof survey_id !== "string") {
    return NextResponse.json({ error: "survey_id is required" }, { status: 400 });
  }

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

  // Survey owner's company profile (what they sell, value prop), used to
  // keep the interview anchored to the company's actual product surface
  // area instead of drifting wherever the respondent's last answer leads.
  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", survey.user_id)
    .maybeSingle();

  const anthropic = getAnthropicClient();
  const systemPrompt = buildInterviewSystemPrompt(
    survey,
    1,
    profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null
  );

  const completion = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: KICKOFF_MESSAGE }],
  });

  const openingQuestion = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!openingQuestion) {
    return NextResponse.json({ error: "Failed to generate opening question" }, { status: 502 });
  }

  const messages: InterviewMessage[] = [{ role: "assistant", content: openingQuestion }];

  const { data: response, error: insertError } = await supabase
    .from("responses")
    .insert({
      survey_id,
      respondent_name: respondent_name ?? null,
      respondent_email: respondent_email ?? null,
      respondent_phone: respondent_phone ?? null,
      custom_field_values: (custom_field_values ?? {}) as Json,
      messages: messages as unknown as Json,
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
  });
}
