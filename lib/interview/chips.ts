// The interviewer is instructed (lib/interview-prompt.ts) to append a
// delimited block after its question containing 2-3 tap-to-fill quick
// replies: ||CHIPS: option one | option two | option three||. This strips
// that block server-side and returns the chips separately so the raw
// delimiter never reaches the respondent.
//
// There's no real token streaming in this app today (the client fakes a
// typewriter reveal client-side after the full response already arrived),
// so this parses a complete string rather than buffering a partial one. If
// true streaming is added later, treat the "||CHIPS:" prefix the same way
// COMPLETE_TOKEN is already buffered for: hold back output once that
// prefix appears until the closing "||" arrives, then run it through this
// same parser.
//
// In practice the model sometimes drops the closing ||, or the response
// gets cut off mid-block — a respondent must never see that raw fragment,
// so this has three layers, checked in order:
//   1. A properly closed ||CHIPS: ... || block: parse and strip it.
//   2. An opening ||CHIPS (colon/space optional) with no closing ||:
//      everything from the opener onward is stripped either way; the
//      content after it is still attempted as pipe-separated chips, so a
//      missing closing || doesn't necessarily mean losing the chips too.
//   3. A truncated prefix of the marker itself at the very end of the
//      string (e.g. "||CH", "||CHIP"): stripped with no chips, since
//      there's nothing to salvage.
const CLOSED_BLOCK_PATTERN = /\|\|CHIPS:\s*([\s\S]*?)\s*\|\|/;
const OPEN_MARKER_PATTERN = /\|\|CHIPS:?\s*/;
const TRUNCATED_MARKER_PATTERN = /\|\|C(H(I(P(S)?)?)?)?$/;

// Guards against turning stray prose into fake "chips" if the salvage path
// below ever hits something that isn't actually a short quick-reply option.
// An option over this length is dropped silently, with the rest of the block
// still parsed — exported so chips.test.ts can assert that against the real
// threshold rather than a copy of it.
export const MAX_CHIP_LENGTH = 100;

function extractChipOptions(raw: string): string[] {
  return raw
    .split("|")
    .map((chip) => chip.trim())
    .filter((chip) => chip.length > 0 && chip.length <= MAX_CHIP_LENGTH)
    .slice(0, 3);
}

// Whether the question just asked wants a short factual answer (a channel,
// a count, a tool name, a yes or no) or a story. The interviewer decides
// this when it writes the question and states it in a marker of its own:
// ||ANSWER: factual|| or ||ANSWER: story||. It is never inferred from the
// question text here. Chips render only for "factual"; a missing or
// unreadable marker counts as "story", because a missing chip costs
// nothing and a chip on a story question costs the answer.
export type AnswerType = "factual" | "story";

// The closing || is optional, but it is never the opener of a chips block
// that follows on the same line ("||ANSWER: factual||CHIPS: ..." must leave
// "||CHIPS: ..." intact for the chips parser, not a bare "CHIPS: ..." that
// would read as prose).
const ANSWER_MARKER_PATTERN = /\|\|\s*ANSWER:?\s*(factual|story)?\s*(\|\|(?!CHIPS))?/i;
// Any further marker, however mangled ("||ANSWER", "|| answer: factual"),
// anywhere in the text: the belt after the braces above.
const ANY_ANSWER_MARKER_PATTERN = /\|\|\s*ANSWER\b[^|\n]*(\|\|(?!CHIPS))?/gi;
// A truncated prefix of the marker at the very end, like "||AN" or "||ANSW".
const TRUNCATED_ANSWER_PATTERN = /\s*\|\|A(N(S(W(E(R)?)?)?)?)?$/;

/**
 * Options that are a one-tap exit with no signal in them. The prompt tells
 * the interviewer never to offer these; this is the backstop, so a chip
 * that slips through is dropped before it reaches the respondent. Typing
 * "not sure" stays available, it is just never offered.
 */
export const DONT_KNOW_CHIP_PATTERN =
  /\b(not sure|unsure|no idea|don'?t know|dont know|do not know|can'?t say|cannot say|hard to say|can'?t recall|don'?t recall|not certain|no clue|never really thought|haven'?t thought|prefer not|rather not|skip)\b|offhand/i;

export function isDontKnowChip(chip: string): boolean {
  return DONT_KNOW_CHIP_PATTERN.test(chip);
}

/** The chips a message may show: only on a factual question, never a way out. */
export function chipsFor(parsed: { chips: string[]; answerType: AnswerType }): string[] {
  if (parsed.answerType !== "factual") return [];
  return parsed.chips.filter((chip) => !isDontKnowChip(chip)).slice(0, 3);
}

function stripAnswerMarker(rawText: string): { text: string; answerType: AnswerType } {
  const match = rawText.match(ANSWER_MARKER_PATTERN);
  let answerType: AnswerType = "story";
  let text = rawText;
  if (match && match.index !== undefined) {
    answerType = match[1]?.toLowerCase() === "factual" ? "factual" : "story";
    text = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim();
  }
  text = text.replace(ANY_ANSWER_MARKER_PATTERN, "").replace(TRUNCATED_ANSWER_PATTERN, "").trim();
  return { text, answerType };
}

/**
 * The last line of defence, applied where text is about to be shown to a
 * respondent (InterviewFlow), independent of the parse above. If a marker
 * or a chips block ever survives parsing, or reaches the client through a
 * path that never parsed (an old stored message, a future streaming
 * transport), it is removed here. Strips every ||ANSWER ...|| and
 * ||CHIPS ...|| block, closed or not, and any truncated opener at the end.
 * Pure, so it is safe in the client bundle.
 */
export function stripInterviewMarkers(text: string): string {
  return text
    .replace(/\|\|\s*CHIPS\b[^|]*(\|[^|]*)*?\|\|/gi, "")
    .replace(/\|\|\s*CHIPS\b[\s\S]*$/i, "")
    .replace(/\|\|\s*ANSWER\b[^|\n]*(\|\|)?/gi, "")
    .replace(/\|\|\s*TOPIC\b[^|\n]*(\|\|)?/gi, "")
    .replace(/\s*\|\|\s*(A(N(S(W(E(R)?)?)?)?)?|C(H(I(P(S)?)?)?)?|T(O(P(I(C)?)?)?)?)?$/i, "")
    .trim();
}

// Which question guide topic the question belongs to, 1-based, stated by
// the interviewer in a marker of its own: ||TOPIC: 3||. Pacing and the
// respondent's progress bar count topics rather than messages, and this is
// the only way to know whether a question opened a new topic or followed
// up on the current one. Null when the marker is missing or unreadable;
// the caller then keeps the previous topic, which never advances the bar
// on a guess.
const TOPIC_MARKER_PATTERN = /\|\|\s*TOPIC:?\s*(\d{1,2})?[^|\n]*(\|\|(?!CHIPS|ANSWER))?/i;
const ANY_TOPIC_MARKER_PATTERN = /\|\|\s*TOPIC\b[^|\n]*(\|\|(?!CHIPS|ANSWER))?/gi;
const TRUNCATED_TOPIC_PATTERN = /\s*\|\|T(O(P(I(C)?)?)?)?$/;

function stripTopicMarker(rawText: string): { text: string; topic: number | null } {
  const match = rawText.match(TOPIC_MARKER_PATTERN);
  let topic: number | null = null;
  let text = rawText;
  if (match && match.index !== undefined) {
    const parsed = match[1] ? Number(match[1]) : NaN;
    topic = Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
    text = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim();
  }
  text = text.replace(ANY_TOPIC_MARKER_PATTERN, "").replace(TRUNCATED_TOPIC_PATTERN, "").trim();
  return { text, topic };
}

export function parseChips(rawText: string): {
  text: string;
  chips: string[];
  answerType: AnswerType;
  topic: number | null;
} {
  // The topic and answer markers sit on their own lines before the chips
  // block. Taken off first so the chips parser below sees exactly what it
  // always has.
  const topicStripped = stripTopicMarker(rawText);
  const stripped = stripAnswerMarker(topicStripped.text);
  const parsed = parseChipBlock(stripped.text);
  return { ...parsed, answerType: stripped.answerType, topic: topicStripped.topic };
}

function parseChipBlock(rawText: string): { text: string; chips: string[] } {
  const closedMatch = rawText.match(CLOSED_BLOCK_PATTERN);
  if (closedMatch && closedMatch.index !== undefined) {
    const chips = extractChipOptions(closedMatch[1]);
    const text = (
      rawText.slice(0, closedMatch.index) + rawText.slice(closedMatch.index + closedMatch[0].length)
    ).trim();
    return { text, chips };
  }

  const openMatch = rawText.match(OPEN_MARKER_PATTERN);
  if (openMatch && openMatch.index !== undefined) {
    console.warn(
      "[parseChips] unclosed ||CHIPS block (missing closing ||), stripping and attempting salvage:",
      JSON.stringify(rawText.slice(openMatch.index))
    );
    const afterOpener = rawText.slice(openMatch.index + openMatch[0].length);
    const chips = extractChipOptions(afterOpener);
    const text = rawText.slice(0, openMatch.index).trim();
    return { text, chips };
  }

  const truncatedMatch = rawText.match(TRUNCATED_MARKER_PATTERN);
  if (truncatedMatch && truncatedMatch.index !== undefined) {
    console.warn(
      "[parseChips] truncated ||CHIPS marker prefix at end of message, stripping:",
      JSON.stringify(truncatedMatch[0])
    );
    const text = rawText.slice(0, truncatedMatch.index).trim();
    return { text, chips: [] };
  }

  return { text: rawText.trim(), chips: [] };
}
