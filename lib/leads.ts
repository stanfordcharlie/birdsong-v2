/**
 * The one definition of "worth a call".
 *
 * This existed twice, inline, in two different shapes. The Leads page's
 * survey cards counted `lead_score >= 7 && status === "new"` over completed
 * responses; the study detail page counted `status === "qualified"` and
 * labelled the result "Qualified leads". A study whose responses scored 9, 9,
 * 8 and 7 therefore read "6 worth a call" on Leads and "Qualified leads: 0"
 * on its own page, because the two numbers were never measuring the same
 * thing.
 *
 * `qualified` is a manual status a human sets after reading a transcript. It
 * cannot double as a score threshold, so the study page's stat is now the
 * Leads page's number, computed here and imported by both.
 *
 * The `status === "new"` clause is part of the definition, not an accident of
 * where it came from: the figure answers "how many people are waiting on
 * someone", so a lead you have already contacted has left the set. Dropping
 * the clause would let the two surfaces disagree again the moment a rep marks
 * a lead contacted.
 */

/** The cutoff the Slack notification, the HubSpot deal threshold and the admin home all use. */
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

export function isWorthACall(row: WorthACallRow): boolean {
  if (row.completed === false) return false;
  return (row.leadScore ?? 0) >= WORTH_A_CALL_SCORE_MIN && (row.status ?? "new") === "new";
}

export function countWorthACall(rows: WorthACallRow[]): number {
  return rows.reduce((total, row) => total + (isWorthACall(row) ? 1 : 0), 0);
}
