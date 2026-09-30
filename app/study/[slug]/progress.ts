// How full the respondent's progress bar is, in percent.
//
// It used to be a step count: one pip per topic, filled to the topic the
// last interviewer message carried (the ||TOPIC: n|| marker). That marker
// only moves when the model decides the topic is finished, and the model
// spends its follow-ups freely, so a real interview reads
// [1, 1, 1, 1, 1, 2]: five questions answered with the bar still on step
// one. Nothing was stale on the client; the number it was told to show
// genuinely had not changed.
//
// So progress is no longer the model's opinion. It is how many questions
// the respondent has actually been asked, against the length the study
// promised, which moves on every question by construction. The count is
// unbounded (follow-ups can push it past the target), so it is held at
// HOLD_PERCENT until the interview really ends: a bar that sits just short
// of the end is honest about "nearly there", where one that hits 100 and
// keeps asking is not.
//
// Nothing here reveals how many questions are left: the bar is a fraction,
// never a count, which is the other half of why the "N of M" label is gone.

/** Where the bar waits while questions are still coming. */
export const HOLD_PERCENT = 90;

/**
 * @param questionsAsked interviewer turns rendered so far (>= 0)
 * @param targetQuestions the study's length preset, in topics (>= 1)
 * @param complete the interview has ended, by any path: the model's own
 *   INTERVIEW_COMPLETE, the server's wrap-up, or an early close after
 *   evasive answers. All of them land here the same way.
 *
 * Non-decreasing in `questionsAsked`, which is what keeps the bar from ever
 * moving backward: the transcript is only ever appended to, so the input
 * this reads only ever grows.
 */
export function interviewProgressPercent(
  questionsAsked: number,
  targetQuestions: number,
  complete: boolean
): number {
  if (complete) return 100;

  const asked = Math.max(0, Math.floor(questionsAsked));
  if (asked === 0) return 0;

  const target = Math.max(1, Math.floor(targetQuestions));
  const fraction = asked / target;
  return Math.min(HOLD_PERCENT, Math.round(fraction * HOLD_PERCENT));
}
