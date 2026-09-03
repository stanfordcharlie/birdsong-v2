import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import { extractBrief } from "@/lib/brief/extract";
import { loadProfileContext } from "@/lib/brief/profile";
import { getActiveOrg, orgErrorResponse, requireOrgPermission } from "@/lib/org";
import {
  ALTERNATION_STANDIN,
  MAX_EXCHANGES,
  buildBriefSystemPrompt,
} from "@/lib/brief/prompt";
import {
  isBriefComplete,
  missingBriefFields,
  type BriefMessage,
  type ExtractedBrief,
} from "@/lib/brief/types";

// POST /api/surveys/brief/continue
// Body: { messages }
// Admin-only. One turn of the brief chat.
//
// Termination is decided here, not by the model: the transcript is extracted
// every turn, and the chat ends the moment every required field is filled or
// the hard cap of MAX_EXCHANGES is reached. The extraction result is also
// what tells the next question which fields are still open, so the chat can
// never ask for something it already has.
//
// Generation is a separate request (/api/surveys/brief/guide) so the client
// can show drafting as its own state rather than hiding it inside a turn.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await requireOrgPermission("study:create");
  } catch (err) {
    return orgErrorResponse(err);
  }

  let body: { messages?: BriefMessage[]; known?: Partial<ExtractedBrief> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const exchangeCount = messages.filter((m) => m.role === "user").length;
  const org = await getActiveOrg();
  const profile = org ? await loadProfileContext(supabase, org.orgId) : null;

  // Anything the wizard already collected before the chat started (the
  // sponsor step runs first) is folded in before the completeness check, so
  // the chat never asks for something the admin has already typed.
  const extracted = await extractBrief(messages);
  const known = body.known ?? {};
  const brief: ExtractedBrief = (Object.keys(extracted) as (keyof ExtractedBrief)[]).reduce(
    (acc, field) => {
      acc[field] = extracted[field] || (known[field] ?? "").trim();
      return acc;
    },
    { ...extracted }
  );
  const complete = isBriefComplete(brief);

  if (complete || exchangeCount >= MAX_EXCHANGES) {
    return NextResponse.json({
      complete: true,
      brief,
      // Stated, not asked. The review step is where the admin decides
      // anything; this message only covers the handoff to drafting.
      closing: "That's what I need. Drafting the research guide now.",
    });
  }

  const anthropic = getAnthropicClient();
  const claudeMessages: Anthropic.MessageParam[] = [
    { role: "user", content: ALTERNATION_STANDIN },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const completion = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 512,
    system: buildBriefSystemPrompt({
      exchangeCount,
      missing: missingBriefFields(brief) as (keyof typeof brief)[],
      profile,
    }),
    messages: claudeMessages,
  });

  const reply = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!reply) {
    return NextResponse.json({ error: "No reply from the model" }, { status: 502 });
  }

  return NextResponse.json({ message: reply, complete: false });
}
