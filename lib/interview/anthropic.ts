import Anthropic from "@anthropic-ai/sdk";

// The model driving both the live interview turns and the post-interview
// extraction pass.
export const INTERVIEW_MODEL = "claude-sonnet-5";

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
    logModelFailure(log.scope, log.requestId, "empty_reply", {
      ...log.fields,
      attempt,
      retried: attempt === 2,
      willRetry,
      ...describeModelResponse(completion, rawText),
    });
  }
  // Both attempts returned a completion with no text. The caller surfaces
  // its existing generic error; both attempts are already in the log.
  return last as InterviewTurnResult;
}
