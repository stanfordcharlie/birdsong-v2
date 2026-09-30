import type Anthropic from "@anthropic-ai/sdk";
import {
  createInterviewTurn,
  describeModelResponse,
  logModelFailure,
  modelParams,
  type MessagesClient,
} from "@/lib/interview/anthropic";
import { CLOSING_MESSAGE, TITLE_RETRY_MESSAGE } from "./prompt";
import {
  CONVERSE_TOOL,
  CONVERSE_TOOL_NAME,
  applyPatch,
  parseConverseReply,
  parseConverseToolInput,
  sanitizePatch,
  titleImpliesSales,
  type BriefPatch,
  type ParsedReply,
} from "./schema";
import { isConversationComplete, type BriefFieldKey, type StudyBrief } from "./types";

// One turn of the study brief conversation: one model call, parsed, checked,
// and reduced to the reply and the patch the page may apply.
//
// The turn is a forced call of the brief_turn tool (lib/study-brief/schema.ts
// says why). A forced tool choice may not be paired with thinking, so this
// call thinks not at all and max_tokens is entirely output: room for a reply,
// a handful of chips and a patch that fills every field of the brief at once,
// which is what a pasted ICP document produces on the first turn.
export const CONVERSE_MAX_TOKENS = 8192;

/**
 * The whole reply, for the log line of a turn that could not be used. The
 * conversation is between Birdsong and an admin about a study they have not
 * created yet, so no respondent has said anything that could be in here.
 */
export const CONVERSE_RAW_PREVIEW = 2000;

export type ConverseTurn =
  | {
      ok: true;
      reply: string;
      chips: string[];
      patch: BriefPatch;
      complete: boolean;
      /** What was kept out of the patch, for the log. */
      dropped: { unknown: string[]; manual: BriefFieldKey[]; invalid: BriefFieldKey[]; title: boolean };
    }
  | { ok: false; code: "MODEL_UNPARSEABLE" | "MODEL_TRUNCATED"; error: string };

type Log = { scope: string; requestId: string };

/** What the model sent, in whichever form it arrived, so a retry can echo it. */
type RawTurn = { toolUse: Anthropic.ToolUseBlock | null; text: string };

type Attempt =
  | { parsed: ParsedReply; raw: RawTurn }
  | { parsed: null; raw: RawTurn; error: string; truncated: boolean };

/**
 * One call and its parse. createInterviewTurn already retries a transient
 * failure or an empty reply once; a thrown error from it is the caller's to
 * map to a response.
 */
async function callAndParse(
  client: MessagesClient,
  params: Anthropic.MessageCreateParamsNonStreaming,
  log: Log,
  phase: string
): Promise<Attempt> {
  const { completion, rawText, toolUse } = await createInterviewTurn(client, params, {
    scope: log.scope,
    requestId: log.requestId,
    fields: { phase },
  });
  const raw: RawTurn = { toolUse, text: rawText };

  // The tool call when there is one, the text when the model answered in
  // text regardless. A turn with neither is the empty reply that
  // createInterviewTurn has already logged twice.
  const result = toolUse ? parseConverseToolInput(toolUse.input) : parseConverseReply(rawText);
  if (result.ok) return { parsed: result.value, raw };

  // The real failure, with what the model actually sent, for the log only.
  const truncated = completion.stop_reason === "max_tokens";
  logModelFailure(log.scope, log.requestId, truncated ? "truncated" : "parse", {
    attemptPhase: phase,
    parseError: result.error,
    usedTool: toolUse !== null,
    toolInput: toolUse ? JSON.stringify(toolUse.input).slice(0, CONVERSE_RAW_PREVIEW) : null,
    ...describeModelResponse(completion, rawText, CONVERSE_RAW_PREVIEW),
  });
  return { parsed: null, raw, error: result.error, truncated };
}

/**
 * The failed turn echoed back, so the model can be asked to change one thing
 * about it. A tool call must be answered with its tool_result, so which shape
 * this takes depends on how the reply arrived.
 */
function echoTurn(raw: RawTurn, instruction: string): Anthropic.MessageParam[] {
  if (raw.toolUse) {
    return [
      { role: "assistant", content: [raw.toolUse] },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: raw.toolUse.id, content: instruction }],
      },
    ];
  }
  return [
    { role: "assistant", content: raw.text },
    { role: "user", content: instruction },
  ];
}

export async function runConverseTurn({
  client,
  system,
  messages,
  brief,
  manualKeys,
  log,
}: {
  client: MessagesClient;
  system: string;
  messages: Anthropic.MessageParam[];
  brief: StudyBrief;
  manualKeys: ReadonlySet<BriefFieldKey>;
  log: Log;
}): Promise<ConverseTurn> {
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    ...modelParams({ maxTokens: CONVERSE_MAX_TOKENS, thinking: "off" }),
    system,
    messages,
    tools: [CONVERSE_TOOL],
    tool_choice: { type: "tool", name: CONVERSE_TOOL_NAME },
  };

  // A reply that does not parse gets the same request once more, without the
  // admin seeing anything. A second failure ends the turn with the brief
  // untouched; a reply cut off at max_tokens says so separately, because
  // that one is ours to fix and not the model having a bad turn.
  let turn = await callAndParse(client, params, log, "turn");
  if (!turn.parsed) turn = await callAndParse(client, params, log, "turn_retry");
  if (!turn.parsed) {
    return turn.truncated
      ? {
          ok: false,
          code: "MODEL_TRUNCATED",
          error: "Birdsong's reply was cut off before it finished. Your brief is unchanged. Try sending that again.",
        }
      : {
          ok: false,
          code: "MODEL_UNPARSEABLE",
          error:
            "Birdsong's reply came back in a form it could not read. Your brief is unchanged. Try sending that again.",
        };
  }

  const { patch, dropped } = sanitizePatch(turn.parsed.briefPatch, manualKeys);
  let reply = turn.parsed.reply;
  let chips = turn.parsed.chips;
  let titleDropped = false;

  if (typeof patch.externalTitle === "string" && titleImpliesSales(patch.externalTitle)) {
    // One regeneration, with the rejected reply and the reason in front of
    // the model. Only the title is taken from it: everything else in the
    // first reply already passed.
    const retry = await callAndParse(
      client,
      { ...params, messages: [...messages, ...echoTurn(turn.raw, TITLE_RETRY_MESSAGE)] },
      log,
      "title_retry"
    );
    const retried = retry.parsed ? sanitizePatch(retry.parsed.briefPatch, manualKeys).patch.externalTitle : undefined;
    if (typeof retried === "string" && retried.length > 0 && !titleImpliesSales(retried)) {
      patch.externalTitle = retried;
      if (retry.parsed) {
        reply = retry.parsed.reply;
        chips = retry.parsed.chips;
      }
    } else {
      // Still failing. The field is left empty for the admin to write.
      delete patch.externalTitle;
      titleDropped = true;
      logModelFailure(log.scope, log.requestId, "title_check", {
        hint: "proposed title implied a sales motive twice; field left empty",
      });
    }
  }

  // Decided here, from the brief the patch produces, rather than taken from
  // the model: it is what the page enables Create study on.
  const complete = isConversationComplete(applyPatch(brief, patch));

  return {
    ok: true,
    reply: reply || CLOSING_MESSAGE,
    chips: complete ? [] : chips,
    patch,
    complete,
    dropped: { ...dropped, title: titleDropped },
  };
}
