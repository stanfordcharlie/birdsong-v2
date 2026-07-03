import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";

const SYSTEM_PROMPT = `You help B2B market researchers draft the research brief that drives an AI-moderated customer discovery interview. This brief is NOT a script and must not contain ready-to-ask questions — the interviewer improvises its own natural, conversational questions in the moment, in whatever order and phrasing fits how the conversation is actually going. Your job is to hand it ideas and direction, not lines to read.

Given the survey's subject (its topic and title) and, if available, what the admin's own company sells, who they target, and their value proposition, write a short, numbered list (4-6 items) of topics or angles worth exploring. Each item is a brief note or bullet describing what to probe and why it matters (the specific signal it's meant to surface) — not a fully-formed question. Phrase items as short directives, not questions: "How the team currently handles X, listen for whether it's manual or automated" rather than "How does your team currently handle X?"

The subject of the survey always comes first: build the brief around what the survey is actually about. If the admin's company context is available, use it to sharpen the angles toward workflows, frictions, or unmet needs their product or service could plausibly address, without ever mentioning the company by name or steering toward a sales pitch. If no company context is available, just build a strong brief from the subject alone rather than guessing at a company angle.

This is internal direction for the AI interviewer, not something read aloud to respondents, so it's fine to be direct about what you want surfaced.

Respond with only the numbered list, nothing else.`;

// POST /api/surveys/question-guide
// Body: { title?, topic?, tone?, existing_guide? }
// Admin-only: generates or improves a survey's question guide with Claude,
// using the survey's subject as the primary driver and the admin's own
// company profile (what they sell / target ICP / value prop, fetched
// server-side) as supporting context to sharpen the angles.
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
    existing_guide?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, topic, tone, existing_guide } = body;

  if (!title && !topic) {
    return NextResponse.json({ error: "Give the survey a title or topic first" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", user.id)
    .maybeSingle();

  const contextLines = [
    `Survey title: ${title || "Not set"}`,
    `Survey subject/topic: ${topic || "Not set"}`,
    `Tone: ${tone || "Not set"}`,
    profile?.what_we_sell ? `What the admin's company sells: ${profile.what_we_sell}` : null,
    profile?.target_icp ? `Their target customer: ${profile.target_icp}` : null,
    profile?.value_prop ? `Their value proposition: ${profile.value_prop}` : null,
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
