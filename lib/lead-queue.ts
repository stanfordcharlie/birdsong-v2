import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * The one definition of which responses belong in the lead queue.
 *
 * A response whose study has been archived is excluded at the database, not
 * in the component: counts, tabs and study cards all derive from the rows
 * this returns, so filtering here is what keeps every number on the page in
 * agreement. Nothing on `responses` changes, so unarchiving a study brings
 * its leads back exactly as they were.
 *
 * The mechanism is an inner join to `surveys` plus a filter on the embedded
 * column: `surveys!inner(...)` drops any response whose parent fails the
 * filter, where a plain embed would keep the row and null the embed.
 */
export const LEAD_QUEUE_STUDY_EMBED = "surveys!inner(title, status, archived_at)";

/**
 * Applies the archived-study exclusion to a `responses` query whose select
 * embeds `surveys!inner(...)` with `archived_at`. Every lead queue read goes
 * through this, so the rule is written once.
 */
export function excludeArchivedStudies<Q extends { is: (column: string, value: null) => Q }>(query: Q): Q {
  return query.is("surveys.archived_at", null);
}

/** Completed, non-archived responses in lead-queue order, plus their fit columns. */
export async function fetchLeadQueue(supabase: SupabaseClient<Database>) {
  const { data: responses, error } = await excludeArchivedStudies(
    supabase
      .from("responses")
      .select(
        "id, respondent_name, respondent_email, custom_field_values, lead_score, status, lead_status, assigned_to, last_activity_at, pain_points, created_at, survey_id, is_test, source, surveys!inner(title, status, archived_at)"
      )
      .eq("completed", true)
  )
    // The order the queue is worked in: hottest first, and among equals the
    // one most recently touched.
    .order("lead_score", { ascending: false, nullsFirst: false })
    .order("last_activity_at", { ascending: false });

  // Company fit lives in its own columns (lib/interview/company-fit.ts) and
  // is fetched separately so the queue keeps working before the
  // response_company_fit migration is applied: if those columns don't exist
  // yet, this query simply errors and every lead falls back to no-fit.
  const { data: fitRows } = await excludeArchivedStudies(
    supabase
      .from("responses")
      .select("id, fit_score, fit_confidence, fit_reasoning, surveys!inner(archived_at)")
      .eq("completed", true)
  );

  return { responses: responses ?? [], fitRows: fitRows ?? [], error };
}
