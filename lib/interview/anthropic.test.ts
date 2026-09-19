import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInterviewTurn, isRetryableModelError, type MessagesClient } from "./anthropic";

const PARAMS = { model: "x", max_tokens: 1, messages: [] } as unknown as Anthropic.MessageCreateParamsNonStreaming;
const LOG = { scope: "interview/test", requestId: "r1", fields: { responseId: "resp" } };

function message(text: string | null): Anthropic.Message {
  return {
    id: "m", type: "message", role: "assistant", model: "x", stop_reason: "end_turn", stop_sequence: null,
    content: text === null ? [] : [{ type: "text", text, citations: null }],
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}
function client(...replies: (Anthropic.Message | Error)[]): MessagesClient & { calls: number } {
  const c = {
    calls: 0,
    messages: {
      create: async () => {
        const next = replies[c.calls++];
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
  return c;
}
function apiError(status: number): Error {
  return new Anthropic.APIError(status, { error: { type: "x" } }, "boom", new Headers());
}

let errorLog: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errorLog = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { errorLog.mockRestore(); });
const logged = () => errorLog.mock.calls.map((c: unknown[]) => JSON.parse(String(c[0])));

describe("createInterviewTurn", () => {
  it("makes one call when the first reply has text, and logs nothing", async () => {
    const c = client(message("Question?"));
    const r = await createInterviewTurn(c, PARAMS, LOG);
    expect(r).toMatchObject({ rawText: "Question?", attempts: 1 });
    expect(c.calls).toBe(1);
    expect(logged()).toEqual([]);
  });

  it("retries once on an empty reply and reports the recovery", async () => {
    const c = client(message(null), message("Second try?"));
    const r = await createInterviewTurn(c, PARAMS, LOG);
    expect(r).toMatchObject({ rawText: "Second try?", attempts: 2 });
    expect(c.calls).toBe(2);
    expect(logged().map((l: Record<string, unknown>) => [l.event, l.phase, l.attempt, l.willRetry ?? null])).toEqual([
      ["failure", "empty_reply", 1, true],
      ["recovered", "retry", 2, null],
    ]);
  });

  it("gives up after a second empty reply and returns the empty text for the caller to surface", async () => {
    const c = client(message(null), message(null));
    const r = await createInterviewTurn(c, PARAMS, LOG);
    expect(r).toMatchObject({ rawText: "", attempts: 2 });
    expect(logged().map((l: Record<string, unknown>) => [l.phase, l.attempt, l.retried])).toEqual([["empty_reply", 1, false], ["empty_reply", 2, true]]);
  });

  it("retries a rate limit, an overload, a 5xx and a connection error", async () => {
    for (const err of [apiError(429), apiError(529), apiError(503), new Anthropic.APIConnectionError({ message: "net" })]) {
      expect(isRetryableModelError(err)).toBe(true);
      const c = client(err, message("ok"));
      const r = await createInterviewTurn(c, PARAMS, LOG);
      expect(r.attempts).toBe(2);
      expect(c.calls).toBe(2);
    }
  });

  it("does not retry a 400 or 401, and rethrows it", async () => {
    for (const status of [400, 401]) {
      const err = apiError(status);
      expect(isRetryableModelError(err)).toBe(false);
      const c = client(err, message("never"));
      await expect(createInterviewTurn(c, PARAMS, LOG)).rejects.toBe(err);
      expect(c.calls).toBe(1);
    }
  });

  it("rethrows when the retry throws too, with both attempts logged", async () => {
    const c = client(apiError(529), apiError(529));
    await expect(createInterviewTurn(c, PARAMS, LOG)).rejects.toBeInstanceOf(Anthropic.APIError);
    expect(logged().map((l: Record<string, unknown>) => [l.phase, l.attempt, l.retried])).toEqual([["model_call", 1, false], ["model_call", 2, true]]);
  });
});
