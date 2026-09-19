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
