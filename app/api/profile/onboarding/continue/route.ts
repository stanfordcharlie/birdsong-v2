import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import {
  ALTERNATION_STANDIN,
  COMPLETE_TOKEN,
  MAX_EXCHANGES,
  buildOnboardingSystemPrompt,
} from "@/lib/profile-onboarding/prompt";
import { researchCompany } from "@/lib/profile-onboarding/research";
import { extractProfile } from "@/lib/profile-onboarding/extract";
import type { OnboardingMessage, ResearchResult } from "@/lib/profile-onboarding/types";

// POST /api/profile/onboarding/continue
// Body: { messages, research }
// Admin-only. On the first respondent answer (company name/website),
// triggers a web-search-backed research pass and folds the findings into
// the system prompt driving the rest of the conversation. Once the model
// signals it has enough (or the soft exchange budget is hit), extracts
// structured profile fields instead of another question.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { messages?: OnboardingMessage[]; research?: ResearchResult | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, research } = body;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const exchangeCount = messages.filter((m) => m.role === "user").length;

  let currentResearch: ResearchResult | null = research ?? null;

  // The first user turn is always their answer to "what's your company
  // name/website" — research it once, here, rather than per turn.
  if (currentResearch === null && exchangeCount === 1) {
    const firstAnswer = messages[messages.length - 1]?.content ?? "";
    try {
      currentResearch = await researchCompany(firstAnswer);
    } catch (err) {
      console.error("[profile/onboarding] research failed:", err);
      currentResearch = { summary: "", sources: [] };
    }
  }

  if (exchangeCount < MAX_EXCHANGES) {
    const anthropic = getAnthropicClient();
    const systemPrompt = buildOnboardingSystemPrompt(currentResearch?.summary || null, exchangeCount);

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
      return NextResponse.json({
        message: reply,
        research: currentResearch,
        complete: false,
      });
    }
  }

  const extracted = await extractProfile(messages);
  return NextResponse.json({
    complete: true,
    extracted,
    research: currentResearch,
  });
}
