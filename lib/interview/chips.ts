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
const CHIP_BLOCK_PATTERN = /\|\|CHIPS:\s*([\s\S]*?)\s*\|\|/;

export function parseChips(rawText: string): { text: string; chips: string[] } {
  const match = rawText.match(CHIP_BLOCK_PATTERN);
  if (!match || match.index === undefined) {
    return { text: rawText.trim(), chips: [] };
  }

  const chips = match[1]
    .split("|")
    .map((chip) => chip.trim())
    .filter(Boolean)
    .slice(0, 3);

  const text = (rawText.slice(0, match.index) + rawText.slice(match.index + match[0].length)).trim();

  return { text, chips };
}
