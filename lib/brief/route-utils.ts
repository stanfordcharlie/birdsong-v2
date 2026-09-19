import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { OrgAccessError } from "@/lib/org";
import { GuideDraftError } from "./generate";
import { describeError } from "./log";

// Logging lives in ./log so lib/brief/critic can log without importing the
// org and Supabase layers this file needs for its error mapping.
export { briefLog, describeError } from "./log";
import type { BriefMessage } from "./types";

// Shared plumbing for the three brief routes (continue, guide, theme):
// request ids, structured logging, a typed error body, and a thrown-value
// to response mapping that cannot itself throw.
//
// The rule every route follows: a handler body runs inside one try, every
// failure becomes { error, code, requestId } with a real HTTP status, and
// every line the route logs carries the request id so a 5xx in the Vercel
// log can be matched to its cause.

export type BriefErrorBody = { error: string; code: string; requestId: string };

/** Short enough to read back from a screen, unique enough to grep a log. */
export function newRequestId(): string {
  return crypto.randomUUID().split("-")[0];
}

export function fail(requestId: string, status: number, code: string, error: string): NextResponse<BriefErrorBody> {
  return NextResponse.json({ error, code, requestId }, { status });
}

export function logFailure(scope: string, requestId: string, phase: string, err: unknown): void {
  const described = describeError(err);
  console.error(JSON.stringify({ scope, requestId, event: "failure", phase, ...described }));
}

const MODEL_MESSAGE_MAX = 240;

/**
 * The response for a thrown value, logged first. Model errors keep their
 * real status class (429 stays 429, an upstream failure is a 502), an org
 * error keeps the status it carries, and anything unrecognised is a 500.
 */
export function errorResponse(scope: string, requestId: string, phase: string, err: unknown): NextResponse<BriefErrorBody> {
  logFailure(scope, requestId, phase, err);

  if (err instanceof OrgAccessError) {
    return fail(requestId, err.status, "FORBIDDEN", err.message);
  }
  // The model answered but with nothing usable. logFailure above already
  // wrote its stop reason and block types; the admin gets the generic line.
  if (err instanceof GuideDraftError) {
    return fail(requestId, 502, "MODEL_EMPTY", `${err.message}. Try again.`);
  }
  // APIConnectionError extends APIError, so it is checked first.
  if (err instanceof Anthropic.APIConnectionError) {
    return fail(requestId, 502, "MODEL_UNREACHABLE", "Couldn't reach the model. Try sending that again.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return fail(requestId, 429, "MODEL_RATE_LIMITED", "The model is busy right now. Wait a moment and try again.");
  }
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? err.status : 502;
    const detail = describeError(err).message.slice(0, MODEL_MESSAGE_MAX);
    if (status === 400) {
      return fail(requestId, 502, "MODEL_REJECTED", `The model rejected the request: ${detail}`);
    }
    if (status === 401 || status === 403) {
      return fail(requestId, 500, "MODEL_AUTH", "The model connection is not set up correctly on our side.");
    }
    return fail(requestId, 502, "MODEL_ERROR", `The model returned an error (${status}). Try sending that again.`);
  }
  return fail(requestId, 500, "UNHANDLED", "Something went wrong on our side. Try sending that again.");
}

/** The first missing environment variable from `names`, or null. */
export function missingEnv(names: readonly string[]): string | null {
  for (const name of names) {
    if (!process.env[name]) return name;
  }
  return null;
}

export const BRIEF_REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// ---------------------------------------------------------------------------
// Messages

export type SanitizedMessages = { ok: true; messages: BriefMessage[] } | { ok: false; error: string };

/**
 * The transcript as the model should see it. Validates the shape of what
 * the client sent, then: trims every message (which also removes trailing
 * whitespace from the last assistant turn), drops anything empty, and
 * collapses consecutive same-role turns into one so roles strictly
 * alternate. The result must end on the customer's turn.
 */
export function sanitizeMessages(raw: unknown): SanitizedMessages {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "messages is required" };

  const cleaned: BriefMessage[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return { ok: false, error: "Every message needs a role and content." };
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return { ok: false, error: "Every message needs a role of user or assistant." };
    if (typeof content !== "string") return { ok: false, error: "Every message needs text content." };
    const text = content.trim();
    if (!text) continue;
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content}\n\n${text}`;
    } else {
      cleaned.push({ role, content: text });
    }
  }

  if (cleaned.length === 0) return { ok: false, error: "Send a message first." };
  if (cleaned[cleaned.length - 1].role !== "user") return { ok: false, error: "The last message must be yours." };
  return { ok: true, messages: cleaned };
}

/** Throws when two neighbours share a role. Called after sanitizing, so a throw here is a bug. */
export function assertAlternation(messages: readonly { role: string }[]): void {
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      throw new Error(`messages do not alternate at index ${i} (${messages[i].role} after ${messages[i - 1].role})`);
    }
  }
}
