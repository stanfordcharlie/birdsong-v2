// The interviewer's emphasis phrase, and the one rule for rendering it.
//
// Every interviewer message carries one **bolded** key phrase (the main
// interview prompt asks for it). Most of the time it sits inline in the
// question and every surface renders it bold in place. Sometimes the model
// puts the phrase on its own after the question instead ("...open a
// record?\n\n**what the record shows**"), and a renderer that trusts the
// markers then shows the phrase as a separate line, or, on the question
// screen, mistakes the bare phrase for the question itself.
//
// So the phrase is treated as a hint, never as content: extractEmphasis
// pulls it out of the message and drops it when it stands alone, and
// emphasisSegments finds it back in the text with a forgiving match and
// bolds the first occurrence in place. Not found means no emphasis, and the
// phrase is never rendered as its own element.

const BOLD_RUN = /\*\*([^*]+)\*\*/;

// A bold run that is the whole of its paragraph (bar punctuation), or that
// trails the last sentence of its paragraph with nothing after it. Both are
// the phrase repeated as a caption rather than emphasis inside a sentence.
// ASCII punctuation plus the general and supplemental punctuation blocks
// (curly quotes, dashes, ellipsis). Spelled out because the compile target
// predates the `u` flag that \p{P} would need.
const PUNCTUATION = "!-/:-@\\[-`{-~\\u00A1-\\u00BF\\u2000-\\u206F\\u2E00-\\u2E7F";
const ONLY_PUNCTUATION = new RegExp(`^[\\s${PUNCTUATION}]*$`);
const TRAILING_RUN = new RegExp(`(?<=[.!?]["')\\]]?)\\s+\\*\\*[^*]+\\*\\*[\\s${PUNCTUATION}]*$`);
const IS_PUNCTUATION = new RegExp(`[${PUNCTUATION}]`);

export type ExtractedEmphasis = {
  /** The message with any standalone phrase removed; inline markers kept. */
  message: string;
  /** `message` with the bold markers stripped. */
  text: string;
  /** The first bolded phrase, trimmed. Null when the message has none. */
  phrase: string | null;
};

export function extractEmphasis(raw: string): ExtractedEmphasis {
  const match = BOLD_RUN.exec(raw);
  const phrase = match ? match[1].trim() || null : null;

  const paragraphs = raw.split(/\n\s*\n/);
  const kept: string[] = [];
  for (const paragraph of paragraphs) {
    if (!BOLD_RUN.test(paragraph)) {
      kept.push(paragraph);
      continue;
    }
    if (ONLY_PUNCTUATION.test(paragraph.replace(BOLD_RUN, ""))) continue;
    kept.push(paragraph.replace(TRAILING_RUN, ""));
  }
  const message = kept.join("\n\n").trim();
  return { message, text: stripMarkers(message), phrase };
}

export function stripMarkers(text: string): string {
  return text.replace(/\*\*/g, "");
}

export type EmphasisSegment = { text: string; bold: boolean };

// Case-insensitive, and blind to punctuation and to how much whitespace sits
// between words, so "What the record shows" finds "what the record, shows".
// Word-bounded on both ends so "the record" cannot land inside "bathe
// records". The first occurrence only; the prompt allows one phrase.
export function emphasisSegments(text: string, phrase: string | null | undefined): EmphasisSegment[] {
  const plain: EmphasisSegment[] = text ? [{ text, bold: false }] : [];
  if (!phrase) return plain;

  const needle = normalize(phrase).text;
  if (!needle) return plain;

  const haystack = normalize(text);
  let from = 0;
  while (from <= haystack.text.length - needle.length) {
    const at = haystack.text.indexOf(needle, from);
    if (at === -1) break;
    const before = at === 0 ? " " : haystack.text[at - 1];
    const after = at + needle.length >= haystack.text.length ? " " : haystack.text[at + needle.length];
    if (before === " " && after === " ") {
      const start = haystack.origin[at];
      const end = haystack.origin[at + needle.length - 1] + 1;
      return [
        { text: text.slice(0, start), bold: false },
        { text: text.slice(start, end), bold: true },
        { text: text.slice(end), bold: false },
      ].filter((segment) => segment.text.length > 0);
    }
    from = at + 1;
  }
  return plain;
}

// Lowercased, punctuation dropped, whitespace runs collapsed to one space,
// with `origin[i]` the index in the source string of normalized char `i`,
// so a match maps back onto the original text without altering it.
function normalize(source: string): { text: string; origin: number[] } {
  let text = "";
  const origin: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      pendingSpace = text.length > 0;
      continue;
    }
    if (IS_PUNCTUATION.test(ch) && ch !== "'") continue;
    if (pendingSpace) {
      text += " ";
      origin.push(i);
      pendingSpace = false;
    }
    text += ch.toLowerCase();
    origin.push(i);
  }
  return { text, origin };
}
