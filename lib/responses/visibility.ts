// The one definition of which responses an admin surface may see.
//
// Same idea as excludeArchivedStudies in lib/lead-queue.ts, and the same
// reason for existing: the study stats, the Responses tab, Home, the sidebar
// count, Leads, search and the report all count the same rows, so the rule
// that removes a deleted response is written once and applied at the
// database. Filtering in a component instead would leave every count that
// does not go through that component disagreeing with it.
//
// A soft-deleted response keeps its row, its transcript and its HubSpot ids
// (supabase/migrations/20260929000000_response_soft_delete.sql). Nothing here
// deletes anything; it only decides what is read.

/** The column, named once so a rename is one edit. */
export const DELETED_COLUMN = "deleted_at";

/**
 * Narrows a `responses` query to the rows that have not been deleted.
 *
 * Typed against the one PostgrestFilterBuilder method it calls, so it accepts
 * a select, a count query or an update alike without importing the client's
 * generic soup.
 */
export function excludeDeletedResponses<Q extends { is: (column: string, value: null) => Q }>(query: Q): Q {
  return query.is(DELETED_COLUMN, null);
}

/**
 * The same rule for an embedded `responses(...)` aggregate, where the filter
 * has to name the embed rather than the table: `surveys` selecting
 * `responses(count)` counts through the embed, so the filter is
 * "responses.deleted_at".
 */
export function excludeDeletedEmbeddedResponses<Q extends { is: (column: string, value: null) => Q }>(query: Q): Q {
  return query.is(`responses.${DELETED_COLUMN}`, null);
}

/**
 * True when a row the client already holds has been deleted. For the few
 * places that filter an in-memory list (the realtime roster) rather than a
 * query.
 */
export function isDeleted(row: { deleted_at?: string | null }): boolean {
  return row.deleted_at != null;
}
