import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/interview/anthropic";

// Thin wrapper around the one agent shape we actually run: a single turn that
// may use tools, ending in a structured-output tool call we can parse. It
// generalizes what lib/interview/company-fit.ts already did by hand:
//
//   1. Contained failure. runAgent never throws. Every error resolves to a
//      definite terminal state so callers are never left ambiguous about
//      whether a run happened.
//   2. A recovery turn. When the model ends its first turn without calling
//      the record tool, we continue the same conversation and force the tool,
//      so the reasoning it already did still produces an answer.
//   3. Observability. Every run writes one row to agent_runs with the model,
//      token usage, latency, and how it terminated.

export type AgentOutcome = "success" | "recovered" | "failed";

export type AgentRunContext = {
  responseId?: string;
  surveyId?: string;
};

export type AgentConfig<T> = {
  // Written to agent_runs.agent_name. Stable per call site, not per run.
  name: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: Anthropic.MessageParam[];
  // May include server-executed tools (web_search) alongside the record tool.
  tools: NonNullable<Anthropic.MessageCreateParams["tools"]>;
  // The structured-output tool whose input is the result.
  recordTool: string;
  // When true (the default) and the first turn produced no recordTool call,
  // make a second call with only that tool and tool_choice forced.
  forceRecoveryTurn?: boolean;
  context?: AgentRunContext;
  // Turns the record tool's raw input into a typed result, or null when the
  // model called the tool with something malformed. Caller-supplied because
  // only the caller knows the shape it asked for.
  parse: (input: unknown) => T | null;
};

export type AgentResult<T> =
  | { result: T; outcome: "success" | "recovered" }
  | { result: null; outcome: "failed"; error: string };

// Recovery is a single forced tool call, so it needs very little room.
const RECOVERY_MAX_TOKENS = 512;

function findRecordToolUse(message: Anthropic.Message, recordTool: string): unknown | null {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === recordTool
  );
  return toolUse ? toolUse.input : null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function runAgent<T>(config: AgentConfig<T>): Promise<AgentResult<T>> {
  const startedAt = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;

  const finish = async (
    outcome: AgentOutcome,
    error: string | null
  ): Promise<void> =>
    logAgentRun({
      name: config.name,
      model: config.model,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      outcome,
      error,
      context: config.context,
    });

  try {
    const anthropic = getAnthropicClient();
    // Copied so the recovery turn's appended messages never mutate the
    // caller's array.
    const messages: Anthropic.MessageParam[] = [...config.messages];

    const first = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.system,
      messages,
      tools: config.tools,
    });
    inputTokens += first.usage.input_tokens;
    outputTokens += first.usage.output_tokens;

    const firstInput = findRecordToolUse(first, config.recordTool);
    const firstResult = firstInput === null ? null : config.parse(firstInput);
    if (firstResult !== null) {
      await finish("success", null);
      return { result: firstResult, outcome: "success" };
    }

    if (config.forceRecoveryTurn === false) {
      const error = `[${config.name}] no valid ${config.recordTool} call and recovery is disabled`;
      console.error(error);
      await finish("failed", error);
      return { result: null, outcome: "failed", error };
    }

    // The model may have researched and reasoned but ended its turn without
    // the structured call. Continue the same conversation and force the tool.
    console.error(`[${config.name}] first turn produced no ${config.recordTool} call; forcing the tool`);
    const recordToolDefinition = config.tools.find((tool) => tool.name === config.recordTool);
    if (!recordToolDefinition) {
      const error = `[${config.name}] recordTool ${config.recordTool} is not in the tools array`;
      console.error(error);
      await finish("failed", error);
      return { result: null, outcome: "failed", error };
    }

    messages.push({ role: "assistant", content: first.content });
    messages.push({
      role: "user",
      content: `Record your assessment now by calling ${config.recordTool} exactly once.`,
    });

    const second = await anthropic.messages.create({
      model: config.model,
      max_tokens: RECOVERY_MAX_TOKENS,
      system: config.system,
      messages,
      tools: [recordToolDefinition],
      tool_choice: { type: "tool", name: config.recordTool },
    });
    inputTokens += second.usage.input_tokens;
    outputTokens += second.usage.output_tokens;

    const secondInput = findRecordToolUse(second, config.recordTool);
    const secondResult = secondInput === null ? null : config.parse(secondInput);
    if (secondResult !== null) {
      await finish("recovered", null);
      return { result: secondResult, outcome: "recovered" };
    }

    const error = `[${config.name}] no valid ${config.recordTool} call after forcing the tool`;
    console.error(error);
    await finish("failed", error);
    return { result: null, outcome: "failed", error };
  } catch (err) {
    const error = errorMessage(err);
    console.error(`[${config.name}] agent call failed:`, err);
    await finish("failed", error);
    return { result: null, outcome: "failed", error };
  }
}

// One row per run. Awaited rather than floated so the insert actually lands
// before a serverless invocation freezes, but its failure is swallowed here:
// observability must never change what the agent returned.
async function logAgentRun(params: {
  name: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  outcome: AgentOutcome;
  error: string | null;
  context?: AgentRunContext;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("agent_runs").insert({
      agent_name: params.name,
      response_id: params.context?.responseId ?? null,
      survey_id: params.context?.surveyId ?? null,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      latency_ms: params.latencyMs,
      outcome: params.outcome,
      error: params.error,
    });
    if (error) throw error;
  } catch (err) {
    console.error(`[agentRuns] failed to log a run of ${params.name}:`, err);
  }
}

// Per-million-token list prices, input and output. Kept as a plain map so
// this stays a pure function: nothing here reads the clock or the network.
// Note claude-sonnet-5 carries introductory pricing of $2/$10 through
// 2026-08-31, so estimates for it run high until then.
const MODEL_PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

// Estimated dollar cost of a run. Returns null for a model we have no price
// for, so a caller can render "unknown" rather than a wrong number.
export function estimateAgentCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = MODEL_PRICING_PER_MTOK[model];
  if (!pricing) return null;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
