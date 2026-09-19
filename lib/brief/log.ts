// Structured logging for the brief pipeline. A leaf module on purpose:
// lib/brief/critic and lib/brief/generate log from inside library code and
// must not drag the route layer (org, Supabase) in with them.

/** One JSON line per event, so the Vercel log is searchable by field. */
export function briefLog(scope: string, requestId: string, event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ scope, requestId, event, ...fields }));
}

/**
 * Primitives only, every read guarded. A caught value can be anything
 * (undefined, a string, an object whose getters throw), and the whole point
 * of the catch is that it is the one place that must not fail.
 */
export function describeError(err: unknown): {
  name: string;
  message: string;
  status: number | null;
  stack: string | null;
  /** Whatever the thrower attached as `details` (see GuideDraftError), if an object. */
  details: Record<string, unknown> | null;
} {
  const obj = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null;
  let name: string = typeof err;
  let message = "";
  let status: number | null = null;
  let stack: string | null = null;
  let details: Record<string, unknown> | null = null;
  try {
    if (obj) {
      if (typeof obj.name === "string") name = obj.name;
      if (typeof obj.message === "string") message = obj.message;
      if (typeof obj.status === "number") status = obj.status;
      if (typeof obj.stack === "string") stack = obj.stack;
      if (typeof obj.details === "object" && obj.details !== null) details = obj.details as Record<string, unknown>;
    }
    if (!message) message = typeof err === "string" ? err : String(err);
  } catch {
    message = message || "(unprintable error)";
  }
  return { name, message, status, stack, details };
}
