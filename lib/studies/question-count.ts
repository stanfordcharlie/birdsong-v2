// The question count guardrails for a new study.
//
// num_questions is a hard total of exchanges, follow-ups included (see
// questionBudgetFor in lib/interview-prompt.ts): it is the number the
// welcome screen promises, the counter the respondent watches and the point
// at which the server stops asking. Five produces too little signal for
// lead scoring and undershoots what a gift card implies, so the wizard
// holds a floor and recommends a range. Constants, not settings: this is a
// quality guardrail, and the wizard is the only place it applies. Existing
// studies keep whatever count they have.
export const QUESTION_COUNT_MIN = 6;
export const QUESTION_COUNT_RECOMMENDED_MIN = 8;
export const QUESTION_COUNT_RECOMMENDED_MAX = 12;
export const QUESTION_COUNT_DEFAULT = 10;

export const QUESTION_COUNT_FLOOR_MESSAGE = "Studies need at least 6 questions to produce useful findings.";
export const QUESTION_COUNT_SHORT_MESSAGE = "Short studies tend to surface less. 8 to 12 works best.";

export type QuestionCountIssue = { kind: "blocked" | "warning"; message: string };

/**
 * Null when the count is fine. "blocked" stops the wizard advancing;
 * "warning" is shown inline and lets it through. A non-number (an empty
 * field, letters) is blocked the same way as a count below the floor.
 */
export function questionCountIssue(raw: string | number): QuestionCountIssue | null {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isInteger(value) || value < QUESTION_COUNT_MIN) {
    return { kind: "blocked", message: QUESTION_COUNT_FLOOR_MESSAGE };
  }
  if (value < QUESTION_COUNT_RECOMMENDED_MIN) {
    return { kind: "warning", message: QUESTION_COUNT_SHORT_MESSAGE };
  }
  return null;
}
