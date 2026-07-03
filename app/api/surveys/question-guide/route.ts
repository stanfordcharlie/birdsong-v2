import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";

const SYSTEM_PROMPT = `You help B2B market researchers draft the research brief that drives an AI-moderated customer discovery interview. This brief is NOT a script and must not contain ready-to-ask questions — the interviewer improvises its own natural, conversational questions in the moment, in whatever order and phrasing fits how the conversation is actually going. Your job is to hand it ideas and direction, not lines to read.

Given the survey's topic, tone, and what the sponsoring company does, write a short, numbered list (4-6 items) of topics or angles worth exploring. Each item is a brief note or bullet describing what to probe and why it matters (the specific signal it's meant to surface) — not a fully-formed question. Phrase items as short directives, not questions: "How the team currently handles X, listen for whether it's manual or automated" rather than "How does your team currently handle X?"

These should be angles whose honest exploration would naturally surface the workflows, frustrations, or unmet needs that the sponsor's product or service could plausibly address, without ever mentioning the sponsor by name or steering toward a sales pitch.

This is internal direction for the AI interviewer, not something read aloud to respondents, so it's fine to be direct about what you want surfaced.

Respond with only the numbered list, nothing else.`;

// POST /api/surveys/question-guide
// Body: { title?, topic?, tone?, sponsor?, sponsor_context?, existing_guide? }
// Admin-only: generates or improves a survey's question guide with Claude,
// using what the sponsor does to steer toward discovery questions that
// surface problems the sponsor could plausibly solve.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: {
    title?: string;
    topic?: string;
    tone?: string;
    sponsor?: string;
    sponsor_context?: string;
    existing_guide?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, topic, tone, sponsor, sponsor_context, existing_guide } = body;

  if (!title && !topic) {
    return NextResponse.json({ error: "Give the survey a title or topic first" }, { status: 400 });
  }

  const contextLines = [
    `Survey title: ${title || "Not set"}`,
    `Survey topic: ${topic || "Not set"}`,
    `Tone: ${tone || "Not set"}`,
    sponsor ? `Sponsoring company: ${sponsor}` : null,
    sponsor_context ? `What the sponsor does: ${sponsor_context}` : null,
    existing_guide ? `Existing draft guide to improve on:\n${existing_guide}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const anthropic = getAnthropicClient();
  const completion = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contextLines }],
  });

  const guide = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!guide) {
    return NextResponse.json({ error: "Failed to generate a question guide" }, { status: 502 });
  }

  return NextResponse.json({ question_guide: guide });
}
