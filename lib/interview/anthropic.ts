import Anthropic from "@anthropic-ai/sdk";

// The model driving both the live interview turns and the post-interview
// extraction pass.
export const INTERVIEW_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// One place that decides how much a call may think, and asserts the budget.
//
// Sonnet 5 thinks before it answers unless told not to, and the thinking
// counts against max_tokens. Every call used to set its own max_tokens with
// no thinking config at all, and at 512 a live interview turn spent the
// whole budget on a thinking block and returned no text (stopReason
// "max_tokens", blockTypes ["thinking"]), which ended the respondent's
// interview with an error around exchange 3 or 4 as thinking grew with the
// transcript. Every call now goes through modelParams: thinking is either
// off, or on with an explicit budget that max_tokens must exceed by
// THINKING_HEADROOM. A bad pairing throws at call time, naming both
// numbers, so it fails loudly in development instead of silently in front
// of a respondent. One API rule to know: thinking may not be enabled on a
// call whose tool_choice forces a tool, so every forced-tool call (guide,
// critic, extraction) is "off" and its max_tokens is all output.

/** Output tokens that must remain after the thinking budget is spent. */
export const THINKING_HEADROOM = 1024;

/**
 * "off" disables thinking outright. "on" is adaptive thinking (the only
 * mode this model accepts; an explicit budget_tokens is rejected) at the
 * given effort, with `budget` the planned ceiling for the thinking that
 * effort produces. The API does not enforce that number; max_tokens is the
 * only hard stop, which is exactly why max_tokens must exceed it by
 * THINKING_HEADROOM. Keep effort "low" unless a call genuinely needs more.
 */
export type ThinkingSetting = "off" | { effort: "low" | "medium" | "high"; budget: number };

export type ModelParams = Pick<Anthropic.MessageCreateParams, "model" | "max_tokens" | "thinking" | "output_config">;

export function modelParams({ maxTokens, thinking }: { maxTokens: number; thinking: ThinkingSetting }): ModelParams {
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new Error(`Model call misconfigured: max_tokens must be a positive integer, got ${maxTokens}`);
  }
  if (thinking === "off") {
    return { model: INTERVIEW_MODEL, max_tokens: maxTokens, thinking: { type: "disabled" } };
  }
  const { budget, effort } = thinking;
  if (!Number.isInteger(budget) || budget < 1024) {
    throw new Error(`Model call misconfigured: thinking budget must be an integer of at least 1024, got ${budget}`);
  }
  if (maxTokens < budget + THINKING_HEADROOM) {
    throw new Error(
      `Model call misconfigured: max_tokens ${maxTokens} must exceed the thinking budget ${budget} by at least ${THINKING_HEADROOM} (need ${budget + THINKING_HEADROOM})`
    );
  }
  return {
    model: INTERVIEW_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    output_config: { effort },
  };
}

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Failure diagnostics, shared by every route that calls the model directly.
//
// There is no shared call wrapper: each route builds its own messages.create
// call. What they share is this pair, which turns an SDK error or a reply
// that could not be used into the structured log line the brief routes
// already emit ({ scope, requestId, event, phase, ... }), so a production
// failure names its real cause instead of the generic string the respondent
// sees. Never logs the API key, any header, or respondent text: model
// output is previewed at 200 characters and its full length is reported.

export const MODEL_OUTPUT_PREVIEW = 200;

export type ModelErrorDetails = {
  name: string;
  message: string;
  stack: string | null;
  status: number | null;
  /** Anthropic's request id, when the SDK error carries one. */
  modelRequestId: string | null;
  /** The API error type ("invalid_request_error", "overloaded_error", ...). */
  errorType: string | null;
};

/** Primitives only, every read guarded: this runs inside a catch. */
export function describeModelError(err: unknown): ModelErrorDetails {
  const obj = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null;
  const out: ModelErrorDetails = {
    name: typeof err,
    message: "",
    stack: null,
    status: null,
    modelRequestId: null,
    errorType: null,
  };
  try {
    if (obj) {
      if (typeof obj.name === "string") out.name = obj.name;
      if (typeof obj.message === "string") out.message = obj.message;
      if (typeof obj.stack === "string") out.stack = obj.stack;
      if (typeof obj.status === "number") out.status = obj.status;
      if (typeof obj.request_id === "string") out.modelRequestId = obj.request_id;
      const inner = obj.error;
      if (typeof inner === "object" && inner !== null) {
        const e = (inner as Record<string, unknown>).error;
        if (typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).type === "string") {
          out.errorType = (e as Record<string, unknown>).type as string;
        }
      }
    }
    if (!out.message) out.message = typeof err === "string" ? err : String(err);
  } catch {
    out.message = out.message || "(unprintable error)";
  }
  return out;
}

/** What the model said about its own reply, for a reply that could not be used. */
export function describeModelResponse(completion: Anthropic.Message, rawText: string) {
  return {
    modelRequestId: (completion as { _request_id?: string })._request_id ?? null,
    stopReason: completion.stop_reason ?? null,
    blockTypes: completion.content.map((block) => block.type),
    outputTokens: completion.usage?.output_tokens ?? null,
    rawLength: rawText.length,
    rawPreview: rawText.slice(0, MODEL_OUTPUT_PREVIEW),
  };
}

/** One JSON line at error level, the same shape the brief routes log. */
export function logModelFailure(
  scope: string,
  requestId: string,
  phase: string,
  fields: Record<string, unknown>
): void {
  console.error(JSON.stringify({ scope, requestId, event: "failure", phase, ...fields }));
}

// ---------------------------------------------------------------------------
// One interview turn with one retry.
//
// A turn can come back empty (a refusal, a non-text block, an empty
// completion) or the call can fail in a way that will not fail again
// (rate limit, overload, a dropped connection). Either used to end the
// respondent's interview with an error on the first try. Both now get
// exactly one retry, the same request again, before anything is surfaced.
// A 400 or 401 is not retried: the same request will not succeed. The SDK
// already retries connection and 429/5xx errors twice with backoff inside
// each call; this is one more attempt on top, not a loop.

export type InterviewTurnResult = {
  completion: Anthropic.Message;
  /** Text blocks joined and trimmed. Empty when both attempts came back empty. */
  rawText: string;
  attempts: 1 | 2;
};

/** A client with just the method this needs, so tests can hand in a fake. */
export type MessagesClient = {
  messages: { create: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message> };
};

export function isRetryableModelError(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.APIError) {
    return typeof err.status === "number" && (err.status === 429 || err.status === 529 || err.status >= 500);
  }
  return false;
}

export function textOf(completion: Anthropic.Message): string {
  return completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

export async function createInterviewTurn(
  client: MessagesClient,
  params: Anthropic.MessageCreateParamsNonStreaming,
  log: { scope: string; requestId: string; fields: Record<string, unknown> }
): Promise<InterviewTurnResult> {
  let last: InterviewTurnResult | null = null;
  let firstStopReason: string | null = null;
  for (const attempt of [1, 2] as const) {
    const willRetry = attempt === 1;
    let completion: Anthropic.Message;
    try {
      completion = await client.messages.create(params);
    } catch (err) {
      const retryable = isRetryableModelError(err);
      logModelFailure(log.scope, log.requestId, "model_call", {
        ...log.fields,
        attempt,
        retried: attempt === 2,
        willRetry: willRetry && retryable,
        retryable,
        ...describeModelError(err),
      });
      if (willRetry && retryable) continue;
      throw err;
    }
    const rawText = textOf(completion);
    last = { completion, rawText, attempts: attempt };
    if (rawText) {
      if (attempt === 2) {
        // The retry cleared it. Same shape, so the earlier failure line
        // and this one can be matched by request id.
        console.error(
          JSON.stringify({ scope: log.scope, requestId: log.requestId, event: "recovered", phase: "retry", ...log.fields, attempt })
        );
      }
      return last;
    }
    const described = describeModelResponse(completion, rawText);
    logModelFailure(log.scope, log.requestId, "empty_reply", {
      ...log.fields,
      attempt,
      retried: attempt === 2,
      willRetry,
      ...described,
    });
    if (attempt === 1) {
      firstStopReason = described.stopReason;
    } else if (described.stopReason !== null && described.stopReason === firstStopReason) {
      // Both attempts died the same way. A transient failure does not
      // repeat identically; a budget or config problem does. Called out on
      // its own line so it is recognisable at a glance.
      logModelFailure(log.scope, log.requestId, "repeated_failure", {
        ...log.fields,
        stopReason: described.stopReason,
        attempts: 2,
        hint: "identical failure on both attempts: suspect max_tokens or thinking config, not a transient error",
      });
    }
  }
  // Both attempts returned a completion with no text. The caller surfaces
  // its existing generic error; both attempts are already in the log.
  return last as InterviewTurnResult;
}
