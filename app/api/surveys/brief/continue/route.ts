import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import { extractBrief } from "@/lib/brief/extract";
import { loadProfileContext } from "@/lib/brief/profile";
import { getActiveOrg, requireOrgPermission } from "@/lib/org";
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
import {
  BRIEF_REQUIRED_ENV,
  assertAlternation,
  briefLog,
  errorResponse,
  fail,
  missingEnv,
  newRequestId,
  sanitizeMessages,
} from "@/lib/brief/route-utils";

// POST /api/surveys/brief/continue
// Body: { messages, known? }
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
//
// Two model calls per turn (extract, then the next question), each a few
// seconds. Node runtime, because the Supabase cookie client and the SDK are
// Node code; 60s is the Hobby ceiling and leaves room for a slow model turn.

export const runtime = "nodejs";
export const maxDuration = 60;

const SCOPE = "brief/continue";

// The next question is one or two sentences, but Sonnet 5 thinks before it
// answers and the thinking counts against max_tokens. At 512 a longer
// transcript spent the whole budget thinking and came back with no text
// block at all, which is what the old "No reply from the model" 502 was.
// Low effort keeps the thinking short; the ceiling makes starvation
// impossible either way.
const REPLY_MAX_TOKENS = 4096;

export async function POST(request: Request) {
  const requestId = newRequestId();
  const startedAt = Date.now();
  const phase = { current: "init" };

  let response: NextResponse;
  try {
    response = await handle(request, requestId, phase);
  } catch (err) {
    response = errorResponse(SCOPE, requestId, phase.current, err);
  }
  briefLog(SCOPE, requestId, "exit", { status: response.status, durationMs: Date.now() - startedAt });
  return response;
}

async function handle(request: Request, requestId: string, phase: { current: string }): Promise<NextResponse> {
  phase.current = "env";
  const missing = missingEnv(BRIEF_REQUIRED_ENV);
  if (missing) {
    briefLog(SCOPE, requestId, "missing_env", { name: missing });
    return fail(requestId, 500, "MISSING_ENV", `The server is missing its ${missing} setting.`);
  }

  phase.current = "auth";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail(requestId, 401, "UNAUTHENTICATED", "You are not signed in.");
  }

  try {
    await requireOrgPermission("study:create");
  } catch (err) {
    return errorResponse(SCOPE, requestId, "permission", err);
  }

  phase.current = "body";
  let body: { messages?: unknown; known?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(requestId, 400, "BAD_JSON", "The request body was not valid JSON.");
  }

  const sanitized = sanitizeMessages(body?.messages);
  if (!sanitized.ok) {
    return fail(requestId, 400, "BAD_MESSAGES", sanitized.error);
  }
  const messages = sanitized.messages;

  // Anything the wizard already collected before the chat started (the
  // sponsor step runs first) is folded in before the completeness check, so
  // the chat never asks for something the admin has already typed. Every
  // field is coerced: a non-string from the client becomes empty.
  const rawKnown = typeof body.known === "object" && body.known !== null ? (body.known as Record<string, unknown>) : {};
  const known: Partial<ExtractedBrief> = {};
  for (const [field, value] of Object.entries(rawKnown)) {
    if (typeof value === "string") known[field as keyof ExtractedBrief] = value.trim();
  }

  const exchangeCount = messages.filter((m) => m.role === "user").length;
  briefLog(SCOPE, requestId, "entry", {
    userId: user.id,
    turns: messages.length,
    exchangeCount,
    inputChars: messages.reduce((n, m) => n + m.content.length, 0),
    knownFields: Object.keys(known).filter((k) => known[k as keyof ExtractedBrief]),
  });

  phase.current = "profile";
  const org = await getActiveOrg();
  let profile = null;
  try {
    profile = org ? await loadProfileContext(supabase, org.orgId) : null;
  } catch (err) {
    // The profile only stops the chat re-asking what is on file. Losing it
    // for one turn is a worse question, not a failed turn.
    briefLog(SCOPE, requestId, "profile_unavailable", { message: String(err instanceof Error ? err.message : err) });
  }

  phase.current = "extract";
  let extracted: ExtractedBrief;
  try {
    extracted = await extractBrief(messages);
  } catch (err) {
    return errorResponse(SCOPE, requestId, "extract", err);
  }

  const brief: ExtractedBrief = (Object.keys(extracted) as (keyof ExtractedBrief)[]).reduce(
    (acc, field) => {
      acc[field] = extracted[field] || (known[field] ?? "");
      return acc;
    },
    { ...extracted }
  );
  const complete = isBriefComplete(brief);
  const stillMissing = missingBriefFields(brief);
  briefLog(SCOPE, requestId, "extracted", { complete, missing: stillMissing });

  if (complete || exchangeCount >= MAX_EXCHANGES) {
    return NextResponse.json({
      complete: true,
      brief,
      // Stated, not asked. The review step is where the admin decides
      // anything; this message only covers the handoff to drafting.
      closing: "That's what I need. Drafting the research guide now.",
      requestId,
    });
  }

  phase.current = "chat";
  // The stored transcript opens on our static assistant message, so a
  // synthetic user turn goes first to keep the array starting on user.
  const claudeMessages: Anthropic.MessageParam[] = [
    ...(messages[0].role === "assistant" ? [{ role: "user" as const, content: ALTERNATION_STANDIN }] : []),
    ...messages.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
  ];
  assertAlternation(claudeMessages);

  const system = buildBriefSystemPrompt({
    exchangeCount,
    missing: stillMissing as (keyof typeof brief)[],
    profile,
  });
  briefLog(SCOPE, requestId, "model.request", {
    model: INTERVIEW_MODEL,
    maxTokens: REPLY_MAX_TOKENS,
    messages: claudeMessages.length,
    systemChars: system.length,
  });

  let completion: Anthropic.Message;
  try {
    completion = await getAnthropicClient().messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: REPLY_MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system,
      messages: claudeMessages,
    });
  } catch (err) {
    return errorResponse(SCOPE, requestId, "chat", err);
  }

  briefLog(SCOPE, requestId, "model.response", {
    stopReason: completion.stop_reason,
    blocks: completion.content.map((block) => block.type),
    inputTokens: completion.usage?.input_tokens ?? null,
    outputTokens: completion.usage?.output_tokens ?? null,
  });

  const reply = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!reply) {
    if (completion.stop_reason === "max_tokens") {
      return fail(requestId, 502, "MODEL_TRUNCATED", "The model ran out of room before it answered. Try sending that again.");
    }
    if (completion.stop_reason === "refusal") {
      return fail(requestId, 502, "MODEL_REFUSED", "The model declined to answer that one. Try putting it another way.");
    }
    return fail(requestId, 502, "MODEL_EMPTY", "The model returned no text. Try sending that again.");
  }

  return NextResponse.json({ message: reply, complete: false, requestId } satisfies {
    message: string;
    complete: false;
    requestId: string;
  });
}

// Exported for the client's benefit only as documentation of the shape it
// should expect; the type is not imported anywhere server-side.
export type BriefContinueResponse =
  | { complete: false; message: string; requestId: string }
  | { complete: true; brief: ExtractedBrief; closing: string; requestId: string }
  | { error: string; code: string; requestId: string };

export type { BriefMessage };
