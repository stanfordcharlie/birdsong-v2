import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";

const SYSTEM_PROMPT = `You help B2B market researchers draft the research brief that drives an AI-moderated customer discovery interview. This brief is NOT a script and must not contain ready-to-ask questions — the interviewer improvises its own natural, conversational questions in the moment, in whatever order and phrasing fits how the conversation is actually going. Your job is to hand it ideas and direction, not lines to read.

Given the survey's subject (its topic and title) and, if available, what the admin's own company sells, who they target, and their value proposition, write a short, numbered list (4-6 items) of topics or angles worth exploring. Each item is a brief note or bullet describing what to probe and why it matters (the specific signal it's meant to surface) — not a fully-formed question. Phrase items as short directives, not questions: "How the team currently handles X, listen for whether it's manual or automated" rather than "How does your team currently handle X?"

The subject of the survey always comes first: build the brief around what the survey is actually about. If the admin's company context is available, use it to sharpen the angles toward workflows, frictions, or unmet needs their product or service could plausibly address, without ever mentioning the company by name or steering toward a sales pitch. If no company context is available, just build a strong brief from the subject alone rather than guessing at a company angle.

This is internal direction for the AI interviewer, not something read aloud to respondents, so it's fine to be direct about what you want surfaced.

Respond with only the numbered list, nothing else.`;

export type QuestionGuideProfileContext = {
  whatWeSell: string | null;
  targetIcp: string | null;
  valueProp: string | null;
};

// Shared by the "Spruce up with AI" button on an existing draft and the
// conversational survey-setup flow's final step, so both produce guides in
// the same style from the same prompt.
export async function generateQuestionGuide(input: {
  title?: string | null;
  topic?: string | null;
  tone?: string | null;
  existingGuide?: string | null;
  profile?: QuestionGuideProfileContext | null;
}): Promise<string> {
  const { title, topic, tone, existingGuide, profile } = input;

  const contextLines = [
    `Survey title: ${title || "Not set"}`,
    `Survey subject/topic: ${topic || "Not set"}`,
    `Tone: ${tone || "Not set"}`,
    profile?.whatWeSell ? `What the admin's company sells: ${profile.whatWeSell}` : null,
    profile?.targetIcp ? `Their target customer: ${profile.targetIcp}` : null,
    profile?.valueProp ? `Their value proposition: ${profile.valueProp}` : null,
    existingGuide ? `Existing draft guide to improve on:\n${existingGuide}` : null,
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
    throw new Error("Failed to generate a question guide");
  }

  return guide;
}
