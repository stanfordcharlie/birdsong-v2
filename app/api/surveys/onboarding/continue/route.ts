import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import {
  ALTERNATION_STANDIN,
  COMPLETE_TOKEN,
  MAX_EXCHANGES,
  buildSurveyOnboardingSystemPrompt,
} from "@/lib/survey-onboarding/prompt";
import { extractSurveySetup } from "@/lib/survey-onboarding/extract";
import type { SurveyOnboardingMessage } from "@/lib/survey-onboarding/types";
import { generateQuestionGuide, type QuestionGuideProfileContext } from "@/lib/surveys/question-guide";

// POST /api/surveys/onboarding/continue
// Body: { messages }
// Admin-only. Drives the conversational survey-setup chat the same way
// /api/profile/onboarding/continue drives company profile setup: once the
// model signals it has enough (or the soft exchange budget is hit),
// extracts structured setup fields, then drafts the question guide from
// those fields using the same generator as "Spruce up with AI".
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { messages?: SurveyOnboardingMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const exchangeCount = messages.filter((m) => m.role === "user").length;

  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileContext: QuestionGuideProfileContext | null = profile
    ? {
        whatWeSell: profile.what_we_sell,
        targetIcp: profile.target_icp,
        valueProp: profile.value_prop,
      }
    : null;

  if (exchangeCount < MAX_EXCHANGES) {
    const anthropic = getAnthropicClient();
    const systemPrompt = buildSurveyOnboardingSystemPrompt(exchangeCount, profileContext);

    const claudeMessages: Anthropic.MessageParam[] = [
      { role: "user", content: ALTERNATION_STANDIN },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await anthropic.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const reply = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (reply && !reply.includes(COMPLETE_TOKEN)) {
      return NextResponse.json({ message: reply, complete: false });
    }
  }

  const setup = await extractSurveySetup(messages);

  let questionGuide: string;
  try {
    questionGuide = await generateQuestionGuide({
      topic: setup.topic,
      tone: setup.tone,
      profile: profileContext,
    });
  } catch {
    questionGuide = "";
  }

  return NextResponse.json({
    complete: true,
    extracted: { ...setup, questionGuide },
  });
}
