// Splits one interviewer message into a conversational lead-in and the
// question proper, for the respondent question screen
// (design_handoff_survey_question): the lead-in renders muted inside the
// speech bubble, the question renders as the headline.
//
// The interviewer prompt (lib/interview-prompt.ts) shapes every message the
// same way: optionally a short acknowledgment or restatement, then exactly one
// question with one **bolded** key phrase. So the question starts at the first
// sentence that carries the bold phrase, or failing that the first sentence
// that ends in a question mark. Everything before it is the lead-in. When
// nothing precedes that sentence, or nothing can be found, the whole message
// is the headline: a wrong split reads worse than no split.

export type SplitQuestion = {
  /** The sentences before the question. Null when there is nothing to lead with. */
  lead: string | null;
  /** The question itself, bold markers intact. Never empty for non-empty input. */
  question: string;
};

// Sentence boundary: terminal punctuation (optionally followed by a closing
// quote or bracket) then whitespace. Abbreviations like "e.g." split wrongly
// here, which is accepted: the interviewer is told to write plainly.
const SENTENCE_BOUNDARY = /(?<=[.!?]["')\]]?)\s+/;

const BOLD = /\*\*[^*]+\*\*/;

export function splitQuestion(message: string): SplitQuestion {
  const text = message.trim();
  if (!text) return { lead: null, question: "" };

  // Paragraph breaks are a stronger signal than sentence ends: the last
  // paragraph is the question and everything above it is the lead-in.
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1];
    if (BOLD.test(last) || last.includes("?")) {
      return { lead: paragraphs.slice(0, -1).join(" "), question: last };
    }
  }

  const sentences = text.split(SENTENCE_BOUNDARY).filter(Boolean);
  if (sentences.length < 2) return { lead: null, question: text };

  let start = sentences.findIndex((s) => BOLD.test(s));
  if (start === -1) start = sentences.findIndex((s) => s.trimEnd().endsWith("?"));
  if (start <= 0) return { lead: null, question: text };

  return {
    lead: sentences.slice(0, start).join(" "),
    question: sentences.slice(start).join(" "),
  };
}

export type QuestionSegments = {
  pre: string;
  /** The bolded key phrase, without its markers. Null when the message has none. */
  highlight: string | null;
  post: string;
};

// Pulls the single **key phrase** out of the question so the screen can
// draw the marker highlight on it. Only the first bold run counts; the
// prompt allows exactly one. Any further markers are rendered as plain text
// rather than shown as raw asterisks.
export function questionSegments(question: string): QuestionSegments {
  const match = BOLD.exec(question);
  if (!match) return { pre: stripBold(question), highlight: null, post: "" };
  return {
    pre: stripBold(question.slice(0, match.index)),
    highlight: match[0].slice(2, -2),
    post: stripBold(question.slice(match.index + match[0].length)),
  };
}

export function stripBold(text: string): string {
  return text.replace(/\*\*/g, "");
}
