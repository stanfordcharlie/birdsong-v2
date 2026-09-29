import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import { isRateLimited } from "@/lib/interview/rate-limit";
import { getActiveOrg, requireOrgPermission } from "@/lib/org";
import { ALTERNATION_STANDIN } from "@/lib/brief/prompt";
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
import { CONVERSE_MAX_TOKENS, runConverseTurn } from "@/lib/study-brief/converse";
import { loadConverseProfile, type ConverseProfile } from "@/lib/study-brief/profile";
import { buildConverseSystemPrompt } from "@/lib/study-brief/prompt";
import { converseRateLimiter } from "@/lib/study-brief/rate-limit";
import { isBriefFieldKey, sanitizeBrief, type BriefFieldKey } from "@/lib/study-brief/types";

// POST /api/surveys/brief/converse
// Body: { messages, brief, manualKeys }
// Admin-only. One turn of the conversational new study page.
//
// The browser sends the conversation so far, the brief as it stands, and the
// keys of the fields the admin edited by hand. It sends nothing else: the
// company profile is read here, for the signed-in admin's own organization.
//
// What comes back is { reply, chips, brief_patch, complete }. The patch has
// already had every unknown key, every manually edited key and every invalid
// value removed (lib/study-brief/schema.ts), and a respondent-facing title
// that implied a sales motive has been regenerated once or left out.
//
// Same wrapper as the other brief routes: one try around the whole body,
// every failure a typed { error, code, requestId } with its real status, and
// the request id on every log line. One model call per turn; a second only
// when the first does not parse or its title fails the check.

export const runtime = "nodejs";
export const maxDuration = 60;

const SCOPE = "brief/converse";

// A pasted ICP document is a legitimate message, so one turn may be long.
// The conversation as a whole is still bounded.
const MESSAGE_MAX_CHARS = 20000;
const MESSAGES_MAX = 60;

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

  phase.current = "rate_limit";
  if (await isRateLimited(converseRateLimiter, user.id)) {
    briefLog(SCOPE, requestId, "rate_limited", { userId: user.id });
    return fail(requestId, 429, "RATE_LIMITED", "That is a lot of messages at once. Wait a moment and try again.");
  }

  phase.current = "body";
  let body: { messages?: unknown; brief?: unknown; manualKeys?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(requestId, 400, "BAD_JSON", "The request body was not valid JSON.");
  }

  if (Array.isArray(body?.messages) && body.messages.length > MESSAGES_MAX) {
    return fail(requestId, 400, "TOO_MANY_MESSAGES", "This conversation is too long to continue. Create the study from the brief, or start again.");
  }
  const sanitized = sanitizeMessages(body?.messages);
  if (!sanitized.ok) {
    return fail(requestId, 400, "BAD_MESSAGES", sanitized.error);
  }
  const messages = sanitized.messages;
  if (messages.some((m) => m.content.length > MESSAGE_MAX_CHARS)) {
    return fail(requestId, 400, "MESSAGE_TOO_LONG", "That message is too long. Paste a shorter part of it.");
  }

  // Everything the browser says about the brief is re-read against the
  // field rules: a key that is not a field, or a value a field would not
  // take, never reaches the prompt.
  const brief = sanitizeBrief(body?.brief);
  const manualKeys = new Set<BriefFieldKey>(
    Array.isArray(body?.manualKeys) ? body.manualKeys.filter(isBriefFieldKey) : []
  );

  briefLog(SCOPE, requestId, "entry", {
    userId: user.id,
    turns: messages.length,
    inputChars: messages.reduce((n, m) => n + m.content.length, 0),
    manualKeys: Array.from(manualKeys),
  });

  phase.current = "profile";
  const org = await getActiveOrg();
  let profile: ConverseProfile | null = null;
  try {
    profile = org ? await loadConverseProfile(supabase, org.orgId) : null;
  } catch (err) {
    // The profile only stops the conversation re-asking what is on file.
    // Losing it for one turn is a worse question, not a failed turn.
    briefLog(SCOPE, requestId, "profile_unavailable", { message: String(err instanceof Error ? err.message : err) });
  }

  phase.current = "chat";
  // The thread opens on Birdsong's static first line unless the admin came
  // from the Home launcher with something typed, so a stand-in user turn
  // goes first when needed to keep the array starting on user.
  const claudeMessages: Anthropic.MessageParam[] = [
    ...(messages[0].role === "assistant" ? [{ role: "user" as const, content: ALTERNATION_STANDIN }] : []),
    ...messages.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
  ];
  assertAlternation(claudeMessages);

  const system = buildConverseSystemPrompt({ profile, brief, manualKeys });
  briefLog(SCOPE, requestId, "model.request", {
    model: INTERVIEW_MODEL,
    maxTokens: CONVERSE_MAX_TOKENS,
    messages: claudeMessages.length,
    systemChars: system.length,
  });

  let turn: Awaited<ReturnType<typeof runConverseTurn>>;
  try {
    turn = await runConverseTurn({
      client: getAnthropicClient(),
      system,
      messages: claudeMessages,
      brief,
      manualKeys,
      log: { scope: SCOPE, requestId },
    });
  } catch (err) {
    return errorResponse(SCOPE, requestId, "chat", err);
  }

  if (!turn.ok) {
    return fail(requestId, 502, turn.code, turn.error);
  }

  briefLog(SCOPE, requestId, "model.response", {
    patched: Object.keys(turn.patch),
    dropped: turn.dropped,
    chips: turn.chips.length,
    complete: turn.complete,
  });

  return NextResponse.json({
    reply: turn.reply,
    chips: turn.chips,
    brief_patch: turn.patch,
    complete: turn.complete,
    requestId,
  } satisfies ConverseResponse);
}

export type ConverseResponse = {
  reply: string;
  chips: string[];
  brief_patch: Record<string, unknown>;
  complete: boolean;
  requestId: string;
};
