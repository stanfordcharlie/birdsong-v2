import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estimateAgentCost, runAgent } from "@/lib/agents/run";

// The Anthropic client and the Supabase admin client are the wrapper's only
// two collaborators, so both are mocked at the module boundary.
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/interview/anthropic", () => ({
  getAnthropicClient: () => ({ messages: { create: mocks.create } }),
  INTERVIEW_MODEL: "claude-sonnet-5",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert: mocks.insert }) }),
}));

function message(content: unknown[], usage: { input: number; output: number }): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content,
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: usage.input, output_tokens: usage.output },
  } as unknown as Anthropic.Message;
}

function recordCall(input: unknown, usage = { input: 100, output: 20 }): Anthropic.Message {
  return message([{ type: "tool_use", id: "toolu_test", name: "record_thing", input }], usage);
}

function textOnly(usage = { input: 100, output: 20 }): Anthropic.Message {
  return message([{ type: "text", text: "I looked into it but stopped here." }], usage);
}

const RECORD_TOOL = {
  name: "record_thing",
  description: "Record the thing.",
  input_schema: { type: "object" as const, properties: { value: { type: "string" } }, required: ["value"] },
};

const WEB_SEARCH_TOOL = { type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 5 };

type Thing = { value: string };

function parseThing(input: unknown): Thing | null {
  const value = (input as { value?: unknown })?.value;
  return typeof value === "string" && value.length > 0 ? { value } : null;
}

function config(overrides: Record<string, unknown> = {}) {
  return {
    name: "test_agent",
    model: "claude-sonnet-5",
    maxTokens: 1500,
    system: "You are a test agent.",
    messages: [{ role: "user" as const, content: "Do the thing." }],
    tools: [WEB_SEARCH_TOOL, RECORD_TOOL],
    recordTool: "record_thing",
    parse: parseThing,
    ...overrides,
  };
}

// The single agent_runs row written by the run under test.
function loggedRow(): Record<string, unknown> {
  expect(mocks.insert).toHaveBeenCalledTimes(1);
  return mocks.insert.mock.calls[0][0] as Record<string, unknown>;
}

beforeEach(() => {
  mocks.create.mockReset();
  mocks.insert.mockReset();
  mocks.insert.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runAgent", () => {
  it("returns success from a first turn that calls the record tool", async () => {
    mocks.create.mockResolvedValueOnce(recordCall({ value: "ok" }, { input: 120, output: 30 }));

    const run = await runAgent(config());

    expect(run).toEqual({ result: { value: "ok" }, outcome: "success" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(loggedRow()).toMatchObject({
      agent_name: "test_agent",
      model: "claude-sonnet-5",
      outcome: "success",
      input_tokens: 120,
      output_tokens: 30,
      error: null,
    });
  });

  it("records latency and the caller's context on the run row", async () => {
    mocks.create.mockResolvedValueOnce(recordCall({ value: "ok" }));

    await runAgent(config({ context: { responseId: "resp-1", surveyId: "surv-1" } }));

    const row = loggedRow();
    expect(row.response_id).toBe("resp-1");
    expect(row.survey_id).toBe("surv-1");
    expect(typeof row.latency_ms).toBe("number");
    expect(row.latency_ms as number).toBeGreaterThanOrEqual(0);
  });

  it("leaves response_id and survey_id null when no context is given", async () => {
    mocks.create.mockResolvedValueOnce(recordCall({ value: "ok" }));

    await runAgent(config());

    expect(loggedRow()).toMatchObject({ response_id: null, survey_id: null });
  });

  it("recovers when the first turn has no record call, forcing the tool on the second", async () => {
    mocks.create
      .mockResolvedValueOnce(textOnly({ input: 200, output: 40 }))
      .mockResolvedValueOnce(recordCall({ value: "recovered" }, { input: 300, output: 15 }));

    const run = await runAgent(config());

    expect(run).toEqual({ result: { value: "recovered" }, outcome: "recovered" });
    expect(mocks.create).toHaveBeenCalledTimes(2);

    const recovery = mocks.create.mock.calls[1][0];
    expect(recovery.tools).toEqual([RECORD_TOOL]);
    expect(recovery.tool_choice).toEqual({ type: "tool", name: "record_thing" });
    expect(recovery.max_tokens).toBe(512);
    expect(recovery.system).toBe("You are a test agent.");
    expect(recovery.messages.at(-1)).toEqual({
      role: "user",
      content: "Record your assessment now by calling record_thing exactly once.",
    });

    // Tokens are summed across both turns.
    expect(loggedRow()).toMatchObject({ outcome: "recovered", input_tokens: 500, output_tokens: 55 });
  });

  it("does not mutate the caller's messages array during recovery", async () => {
    const messages = [{ role: "user" as const, content: "Do the thing." }];
    mocks.create
      .mockResolvedValueOnce(textOnly())
      .mockResolvedValueOnce(recordCall({ value: "recovered" }));

    await runAgent(config({ messages }));

    expect(messages).toHaveLength(1);
  });

  it("fails without throwing when the recovery turn also produces nothing valid", async () => {
    mocks.create.mockResolvedValueOnce(textOnly()).mockResolvedValueOnce(textOnly());

    const run = await runAgent(config());

    expect(run.outcome).toBe("failed");
    expect(run.result).toBeNull();
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(loggedRow()).toMatchObject({ outcome: "failed" });
    expect(loggedRow().error).toContain("record_thing");
  });

  it("skips the recovery turn when forceRecoveryTurn is false", async () => {
    mocks.create.mockResolvedValueOnce(textOnly());

    const run = await runAgent(config({ forceRecoveryTurn: false }));

    expect(run.outcome).toBe("failed");
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(loggedRow()).toMatchObject({ outcome: "failed" });
  });

  it("fails without throwing when the Anthropic client throws", async () => {
    mocks.create.mockRejectedValueOnce(new Error("overloaded_error"));

    const run = await runAgent(config());

    expect(run).toEqual({ result: null, outcome: "failed", error: "overloaded_error" });
    expect(loggedRow()).toMatchObject({ outcome: "failed", error: "overloaded_error" });
  });

  it("fails without throwing when the recovery turn throws", async () => {
    mocks.create.mockResolvedValueOnce(textOnly()).mockRejectedValueOnce(new Error("rate_limit_error"));

    const run = await runAgent(config());

    expect(run.outcome).toBe("failed");
    expect((run as { error: string }).error).toBe("rate_limit_error");
  });

  it("treats a malformed record call as no result, then recovers", async () => {
    mocks.create
      .mockResolvedValueOnce(recordCall({ value: 42 }))
      .mockResolvedValueOnce(recordCall({ value: "clean" }));

    const run = await runAgent(config());

    expect(run).toEqual({ result: { value: "clean" }, outcome: "recovered" });
  });

  it("fails when parse rejects both the first and the recovery call", async () => {
    mocks.create
      .mockResolvedValueOnce(recordCall({ value: 42 }))
      .mockResolvedValueOnce(recordCall({ nope: true }));

    const run = await runAgent(config());

    expect(run.outcome).toBe("failed");
    expect(run.result).toBeNull();
  });

  it("returns the result unchanged when the agent_runs insert rejects", async () => {
    mocks.insert.mockRejectedValue(new Error("connection terminated"));
    mocks.create.mockResolvedValueOnce(recordCall({ value: "ok" }));

    const run = await runAgent(config());

    expect(run).toEqual({ result: { value: "ok" }, outcome: "success" });
  });

  it("returns the result unchanged when the agent_runs insert returns an error", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "permission denied" } });
    mocks.create.mockResolvedValueOnce(recordCall({ value: "ok" }));

    const run = await runAgent(config());

    expect(run).toEqual({ result: { value: "ok" }, outcome: "success" });
  });
});

describe("estimateAgentCost", () => {
  it("prices a known model from its per-million-token rates", () => {
    // 1M input at $3 plus 1M output at $15.
    expect(estimateAgentCost("claude-sonnet-5", 1_000_000, 1_000_000)).toBeCloseTo(18);
    expect(estimateAgentCost("claude-sonnet-5", 500_000, 0)).toBeCloseTo(1.5);
  });

  it("returns zero for a known model with no usage", () => {
    expect(estimateAgentCost("claude-sonnet-5", 0, 0)).toBe(0);
  });

  it("returns null for a model it has no price for", () => {
    expect(estimateAgentCost("some-future-model", 1000, 1000)).toBeNull();
  });
});
