import type Anthropic from "@anthropic-ai/sdk";
import { INTERVIEW_LENGTHS } from "@/lib/studies/interview-length";
import {
  BRIEF_FIELD_KEYS,
  coerceFieldValue,
  isBriefFieldKey,
  type BriefFieldKey,
  type StudyBrief,
} from "./types";

// What the model returns for one turn, and everything that is done to it
// before any of it reaches the brief. Hand-written: the repo has no schema
// library, and the shape is four keys.
//
// The turn is a tool call, not a JSON object in a text reply. Asked for
// "one JSON object and nothing else", Sonnet 5 complied while the answers
// were substantial and dropped the envelope the moment one was short: a
// one-line answer to "what makes someone worth a call" came back as
// "Good, noted. Anything off limits?" five times out of five, with no
// patch, which the parser could only reject. A forced tool call cannot come
// back as prose. The tool is deliberately not `strict`: the API compiles a
// strict schema into a decoder and rejects this one as too complex (the
// patch has fourteen optional fields, and eleven is about the ceiling), and
// every value is re-checked by sanitizePatch anyway. The text parser below
// is kept as a fallback for a reply that arrives as text regardless.

export type BriefPatch = Partial<StudyBrief>;

/** The reply as parsed. `briefPatch` is still untrusted here; see sanitizePatch. */
export type ParsedReply = {
  reply: string;
  chips: string[];
  briefPatch: Record<string, unknown>;
  complete: boolean;
};

export type ParseResult = { ok: true; value: ParsedReply } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// The tool the model answers with.

export const CONVERSE_TOOL_NAME = "brief_turn";

const STRING = { type: "string" } as const;
const STRING_ARRAY = { type: "array", items: STRING } as const;

/**
 * One entry per brief field, so a field added to BRIEF_FIELD_KEYS cannot be
 * left out of what the model is allowed to send. The descriptions the model
 * reads are in lib/study-brief/prompt.ts; these are the types.
 */
const PATCH_PROPERTIES: Record<BriefFieldKey, Record<string, unknown>> = {
  internalName: STRING,
  externalTitle: STRING,
  sponsor: STRING,
  audienceRoles: STRING,
  audienceCompanies: STRING,
  audienceIndustry: STRING,
  researchQuestion: STRING,
  topic: STRING,
  signals: STRING_ARRAY,
  offLimits: STRING,
  publicDescription: STRING,
  length: { type: "string", enum: [...INTERVIEW_LENGTHS] },
  giftAmount: { type: "number" },
  giftBrand: STRING,
};

export const CONVERSE_TOOL: Anthropic.Tool = {
  name: CONVERSE_TOOL_NAME,
  description:
    "Say one thing to the admin and record the brief fields this turn settled. Every turn of the conversation is one call of this tool.",
  input_schema: {
    type: "object",
    required: ["reply", "chips", "brief_patch", "complete"],
    properties: {
      reply: { type: "string", description: "What you say to the admin this turn. At most three sentences." },
      chips: {
        ...STRING_ARRAY,
        description: "Quick replies the admin can press. Empty unless the question is a choice.",
      },
      brief_patch: {
        type: "object",
        description: `Only the brief fields this turn changed, by their exact names (${BRIEF_FIELD_KEYS.join(", ")}). Empty when nothing changed.`,
        properties: PATCH_PROPERTIES as Record<string, unknown>,
      },
      complete: { type: "boolean", description: "True when nothing is still open after this turn." },
    },
  },
};


const CHIPS_MAX = 4;
const CHIP_LENGTH_MAX = 48;

/**
 * The JSON object inside a model reply. The model is told to return JSON
 * only, and mostly does; what it does otherwise is wrap it in a code fence
 * or put a sentence before it, so both are read through.
 */
export function extractJson(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

export function parseConverseReply(raw: string): ParseResult {
  const json = extractJson(raw);
  if (json === null) return { ok: false, error: "no JSON object in the reply" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return { ok: false, error: `invalid JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
  return parseConverseBody(parsed);
}

/**
 * The input of a brief_turn call. The API has already parsed it, so there is
 * no JSON to read; the same field rules apply as to a text reply, because a
 * tool schema without `strict` is a description and not a guarantee.
 */
export function parseConverseToolInput(input: unknown): ParseResult {
  return parseConverseBody(input);
}

/** The four keys, wherever they arrived from. */
function parseConverseBody(parsed: unknown): ParseResult {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "the reply is not a JSON object" };
  }

  const body = parsed as Record<string, unknown>;
  if (typeof body.reply !== "string" || body.reply.trim().length === 0) {
    return { ok: false, error: "reply is missing or empty" };
  }

  const patch = body.brief_patch;
  if (patch !== undefined && patch !== null && (typeof patch !== "object" || Array.isArray(patch))) {
    return { ok: false, error: "brief_patch is not an object" };
  }

  const chips = Array.isArray(body.chips)
    ? body.chips
        .filter((chip): chip is string => typeof chip === "string")
        .map((chip) => cleanCopy(chip).slice(0, CHIP_LENGTH_MAX).trim())
        .filter((chip) => chip.length > 0)
        .slice(0, CHIPS_MAX)
    : [];

  return {
    ok: true,
    value: {
      reply: cleanCopy(body.reply),
      chips,
      briefPatch: (patch as Record<string, unknown> | null | undefined) ?? {},
      complete: body.complete === true,
    },
  };
}

/** An em or en dash set off as punctuation becomes a comma. */
export function stripDashes(value: string): string {
  return value.replace(/\s*[\u2014\u2013]\s*/g, ", ").trim();
}

/**
 * The copy rules the prompt asks for, applied whether or not it listened:
 * no em dashes, and a study is never a survey.
 */
export function cleanCopy(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\bsurveys\b/g, "studies")
    .replace(/\bSurveys\b/g, "Studies")
    .replace(/\bsurvey\b/g, "study")
    .replace(/\bSurvey\b/g, "Study")
    .trim();
}

export type SanitizedPatch = {
  patch: BriefPatch;
  dropped: {
    /** Keys that are not brief fields. */
    unknown: string[];
    /** Fields the admin has edited by hand, which a suggestion never overwrites. */
    manual: BriefFieldKey[];
    /** Known fields whose value was not usable. */
    invalid: BriefFieldKey[];
  };
};

/**
 * The patch that may be applied. Three things are removed, in this order:
 * any key that is not a brief field, any field in the manually edited set,
 * and any value that is not valid for its field.
 */
export function sanitizePatch(
  raw: Record<string, unknown>,
  manualKeys: ReadonlySet<BriefFieldKey>
): SanitizedPatch {
  const patch: BriefPatch = {};
  const dropped: SanitizedPatch["dropped"] = { unknown: [], manual: [], invalid: [] };

  for (const [key, value] of Object.entries(raw)) {
    if (!isBriefFieldKey(key)) {
      dropped.unknown.push(key);
      continue;
    }
    if (manualKeys.has(key)) {
      dropped.manual.push(key);
      continue;
    }
    // Dashes only. A field holds the admin's own subject matter, which may
    // well be about surveys, so the word is left alone here.
    const coerced = coerceFieldValue(key, typeof value === "string" ? stripDashes(value) : value);
    if (coerced === undefined) {
      dropped.invalid.push(key);
      continue;
    }
    (patch as Record<BriefFieldKey, unknown>)[key] = coerced;
  }

  // A brand means nothing without an amount. The wizard only asks for one
  // once an amount exists, and only stores it then.
  if (patch.giftAmount === 0 || patch.giftAmount === null) patch.giftBrand = null;

  return { patch, dropped };
}

export function applyPatch(brief: StudyBrief, patch: BriefPatch): StudyBrief {
  return { ...brief, ...patch };
}

// ---------------------------------------------------------------------------
// The respondent-facing title must never imply a sales motive.

/**
 * Whole words, with their ordinary inflections. Matching the bare letters
 * would reject "demand gen leaders" for containing "lead" and "demographics"
 * for containing "demo", which are exactly the titles a study should have.
 */
const SALES_WORDS = /\b(sales|leads?|demos?|buy(?:s|ing|ers?)?|pitch(?:es|ing)?)\b/i;

export function titleImpliesSales(title: string): boolean {
  return SALES_WORDS.test(title);
}
