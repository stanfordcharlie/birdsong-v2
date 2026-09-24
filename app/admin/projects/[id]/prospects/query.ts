import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// The one read of a study's prospect roster, shared by the roster page and
// the study page's preview. Explicit columns: firmographics and apollo_id
// are deliberately not read, since nothing on either screen renders them,
// and a page that does not fetch them cannot leak them into a client
// bundle.

export type ProspectRosterRow = {
  id: string;
  token: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  title: string | null;
  company_name: string | null;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  instantly_removed_at: string | null;
  instantly_error: string | null;
};

export async function loadProspectRoster(
  supabase: SupabaseClient<Database>,
  surveyId: string
): Promise<ProspectRosterRow[]> {
  const { data } = await supabase
    .from("prospects")
    .select(
      "id, token, first_name, last_name, email, title, company_name, status, created_at, started_at, completed_at, instantly_removed_at, instantly_error"
    )
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export function prospectDisplayName(row: Pick<ProspectRosterRow, "first_name" | "last_name">): string | null {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || null;
}

/** The most recent thing that happened to the prospect: finished, started, or added. */
export function prospectLastActivity(row: Pick<ProspectRosterRow, "completed_at" | "started_at" | "created_at">): string {
  return row.completed_at ?? row.started_at ?? row.created_at;
}
