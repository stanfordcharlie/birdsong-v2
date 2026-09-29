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
  applyPatch,
  parseConverseReply,
  sanitizePatch,
  titleImpliesSales,
  type BriefPatch,
  type ParsedReply,
} from "./schema";
import { isConversationComplete, type BriefFieldKey, type StudyBrief } from "./types";

// One turn of the study brief conversation: one model call, parsed, checked,
// and reduced to the reply and the patch the page may apply.
//
// The reply is a JSON object of a few short strings, but Sonnet 5 thinks
// before it answers and the thinking counts against max_tokens. modelParams
// caps the thinking at an explicit budget and asserts this ceiling leaves
// THINKING_HEADROOM for the reply. Same numbers as brief/continue.
export const CONVERSE_MAX_TOKENS = 4096;
export const CONVERSE_THINKING = { effort: "low", budget: 2048 } as const;

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
  | { ok: false; code: "MODEL_UNPARSEABLE"; error: string };

type Log = { scope: string; requestId: string };

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
): Promise<{ parsed: ParsedReply; rawText: string } | { parsed: null; rawText: string; error: string }> {
  const { completion, rawText } = await createInterviewTurn(client, params, {
    scope: log.scope,
    requestId: log.requestId,
    fields: { phase },
  });
  const result = parseConverseReply(rawText);
  if (result.ok) return { parsed: result.value, rawText };

  // The real failure, with what the model actually sent, for the log only.
  logModelFailure(log.scope, log.requestId, "parse", {
    attemptPhase: phase,
    parseError: result.error,
    ...describeModelResponse(completion, rawText),
  });
  return { parsed: null, rawText, error: result.error };
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
    ...modelParams({ maxTokens: CONVERSE_MAX_TOKENS, thinking: CONVERSE_THINKING }),
    system,
    messages,
  };

  // A reply that does not parse gets the same request once more. A second
  // failure ends the turn with the brief untouched.
  let turn = await callAndParse(client, params, log, "turn");
  if (!turn.parsed) turn = await callAndParse(client, params, log, "turn_retry");
  if (!turn.parsed) {
    return {
      ok: false,
      code: "MODEL_UNPARSEABLE",
      error: "Birdsong's reply came back in a form it could not read. Your brief is unchanged. Try sending that again.",
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
      {
        ...params,
        messages: [
          ...messages,
          { role: "assistant", content: turn.rawText },
          { role: "user", content: TITLE_RETRY_MESSAGE },
        ],
      },
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
