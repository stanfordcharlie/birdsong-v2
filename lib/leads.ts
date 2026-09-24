/**
 * The one definition of "worth a call", and the one score threshold.
 *
 * Two questions share the phrase, and they are kept apart here on purpose:
 *
 * - scoresWorthACall: did this interview score high enough to be worth a
 *   call at all? Threshold only. This is what a study reports about its own
 *   yield (the study page's stat and its "Worth a call" filter): a lead a
 *   rep has since contacted still came from that study and still scored 7.
 * - isWorthACall: is this lead waiting on someone right now? Threshold plus
 *   `status === "new"`. This is what a work queue wants (the Leads page and
 *   the admin home), where a contacted lead has left the pile.
 *
 * The study page used to use the queue definition, so a study whose only
 * strong lead had been marked contacted read "Worth a call: 0" next to a
 * response scored 7. Both definitions read the same threshold below, which
 * is the only place the number 7 lives on the admin side.
 */

/** The cutoff every admin surface uses. lib/hubspot.ts and lib/slack keep their own, matching, constants. */
export const WORTH_A_CALL_SCORE_MIN = 7;

export type WorthACallRow = {
  leadScore: number | null | undefined;
  status: string | null | undefined;
  /**
   * Omit where the row set is already filtered to completed responses (the
   * Leads page queries `completed = true`). An in-progress interview has no
   * final score, so it is never worth a call.
   */
  completed?: boolean | null;
};

/** Scored at or above the threshold, whatever has happened to the lead since. */
export function scoresWorthACall(row: Pick<WorthACallRow, "leadScore" | "completed">): boolean {
  if (row.completed === false) return false;
  return (row.leadScore ?? 0) >= WORTH_A_CALL_SCORE_MIN;
}

/** Scored at or above the threshold and still waiting on someone. */
export function isWorthACall(row: WorthACallRow): boolean {
  return scoresWorthACall(row) && (row.status ?? "new") === "new";
}

/** How many of a study's responses scored worth a call. Yield, not queue. */
export function countWorthACall(rows: WorthACallRow[]): number {
  return rows.reduce((total, row) => total + (scoresWorthACall(row) ? 1 : 0), 0);
}
