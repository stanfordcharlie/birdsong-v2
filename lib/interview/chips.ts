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
const MAX_CHIP_LENGTH = 100;

function extractChipOptions(raw: string): string[] {
  return raw
    .split("|")
    .map((chip) => chip.trim())
    .filter((chip) => chip.length > 0 && chip.length <= MAX_CHIP_LENGTH)
    .slice(0, 3);
}

export function parseChips(rawText: string): { text: string; chips: string[] } {
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
