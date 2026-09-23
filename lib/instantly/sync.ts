// The seam between a completed response and lib/instantly/client.ts, in the
// shape of lib/hubspot-sync.ts: reads the environment, decides whether there
// is anything to do, makes the one call, records the outcome on the prospect
// row, and never throws. The interview completion path awaits this before it
// answers the respondent, so "never throws" and "never hangs" (the client's
// 5s timeout) are what keep completion identical whether Instantly is up,
// down, slow or unconfigured.
//
// This is the only place INSTANTLY_API_KEY and INSTANTLY_COMPLETED_LIST_ID
// are read.
//
// Skips, none of which write anything:
//   no prospect        the response came through the generic link
//   no campaign        surveys.instantly_campaign_id is NULL
//   already removed    prospects.instantly_removed_at is set (idempotent)
//   not configured     either env var is missing; logged once per process
// Outcomes, both written to the prospect row:
//   ok      instantly_removed_at = now, instantly_job_id, instantly_error = NULL
//   failed  instantly_error = short reason; instantly_removed_at stays NULL
// No retry, no queue. A failed row is fixed by hand in Instantly.

import { createInstantlyClient, removeProspectFromCampaign } from "./client";
import { briefLog } from "@/lib/brief/log";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

const SCOPE = "instantly";

// Warned once per process, not once per completion: an unconfigured
// deployment would otherwise log a line for every interview that finishes.
let warnedAboutMissingEnv = false;

export type InstantlyMoveOutcome =
  | { status: "moved"; jobId: string | null }
  | { status: "skipped"; reason: "no_prospect" | "no_campaign" | "already_removed" | "not_configured" | "prospect_missing" }
  | { status: "failed"; error: string };

export async function moveCompletedProspectOutOfCampaign({
  supabase,
  responseId,
  prospectId,
  campaignId,
}: {
  supabase: Client;
  /** Used as the request id in the log lines, so a completion's lines group. */
  responseId: string;
  prospectId: string | null | undefined;
  /** surveys.instantly_campaign_id of the study the response belongs to. */
  campaignId: string | null | undefined;
}): Promise<InstantlyMoveOutcome> {
  try {
    if (!prospectId) return { status: "skipped", reason: "no_prospect" };
    if (!campaignId) return { status: "skipped", reason: "no_campaign" };

    const apiKey = process.env.INSTANTLY_API_KEY;
    const toListId = process.env.INSTANTLY_COMPLETED_LIST_ID;
    if (!apiKey || !toListId) {
      if (!warnedAboutMissingEnv) {
        warnedAboutMissingEnv = true;
        briefLog(SCOPE, responseId, "not_configured", {
          missing: [!apiKey && "INSTANTLY_API_KEY", !toListId && "INSTANTLY_COMPLETED_LIST_ID"].filter(Boolean),
        });
      }
      return { status: "skipped", reason: "not_configured" };
    }

    const { data: prospect, error: lookupError } = await supabase
      .from("prospects")
      .select("email, instantly_removed_at")
      .eq("id", prospectId)
      .maybeSingle();
    if (lookupError) {
      briefLog(SCOPE, responseId, "failure", { phase: "lookup", prospectId, message: lookupError.message });
      return { status: "failed", error: `prospect lookup failed: ${lookupError.message}` };
    }
    if (!prospect) return { status: "skipped", reason: "prospect_missing" };
    if (prospect.instantly_removed_at) return { status: "skipped", reason: "already_removed" };

    const result = await removeProspectFromCampaign(createInstantlyClient(apiKey), {
      email: prospect.email,
      campaignId,
      toListId,
    });

    if (!result.ok) {
      briefLog(SCOPE, responseId, "failure", { phase: "move", prospectId, campaignId, error: result.error });
      const { error: writeError } = await supabase
        .from("prospects")
        .update({ instantly_error: result.error })
        .eq("id", prospectId);
      if (writeError) {
        briefLog(SCOPE, responseId, "failure", { phase: "record_error", prospectId, message: writeError.message });
      }
      return { status: "failed", error: result.error };
    }

    const { error: writeError } = await supabase
      .from("prospects")
      .update({
        instantly_removed_at: new Date().toISOString(),
        instantly_job_id: result.jobId,
        instantly_error: null,
      })
      .eq("id", prospectId);
    if (writeError) {
      // The move happened; only the record of it is missing. Loud, because
      // the next completion for this prospect would move them again (a
      // harmless no-op on Instantly's side) and the roster would not show it.
      briefLog(SCOPE, responseId, "failure", { phase: "record_success", prospectId, message: writeError.message });
    }
    briefLog(SCOPE, responseId, "moved", { prospectId, campaignId, jobId: result.jobId });
    return { status: "moved", jobId: result.jobId };
  } catch (err) {
    // Nothing above is expected to throw, and completion must not care if
    // something does. One line, then carry on.
    const message = err instanceof Error ? err.message : String(err);
    briefLog(SCOPE, responseId, "failure", { phase: "unexpected", prospectId: prospectId ?? null, message });
    return { status: "failed", error: message };
  }
}
