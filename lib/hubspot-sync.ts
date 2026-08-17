// The seam between a completed Birdsong response and lib/hubspot.ts: reads the
// access token, assembles the lead, runs the sync, records the outcome on the
// response row, and — most importantly — never throws.
//
// This is the ONLY place HUBSPOT_ACCESS_TOKEN is read. Two call sites need the
// sync (the interview completion path and the manual re-sync button on the
// admin detail page), and having each read the environment itself would be
// exactly the duplication that makes per-customer OAuth tokens painful to
// introduce later. lib/hubspot.ts still takes a client on every function;
// swapping this one resolver for a per-customer token lookup is the whole
// migration.

import {
  createHubSpotClient,
  HubSpotApiError,
  syncLeadToHubSpot,
  type HubSpotClient,
  type HubSpotLead,
} from "@/lib/hubspot";
import { formatPainPointList, selectCallScriptOpener } from "@/lib/lead-content";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

// Warned once per process, not once per response: an unconfigured portal
// would otherwise log a line for every interview that completes.
let warnedAboutMissingToken = false;

// Returns null when HubSpot is simply not configured, which is a normal state
// (self-hosted installs, local development, customers who do not use HubSpot)
// and never an error.
export function getHubSpotClientFromEnv(): HubSpotClient | null {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    if (!warnedAboutMissingToken) {
      warnedAboutMissingToken = true;
      console.warn("[hubspot] HUBSPOT_ACCESS_TOKEN is not set; skipping all HubSpot sync");
    }
    return null;
  }
  return createHubSpotClient(token);
}

export type HubSpotSyncResult =
  | { status: "synced"; contactId: string; dealId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export type HubSpotSyncInput = {
  supabase: Client;
  responseId: string;
  surveyTitle: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  company: string | null;
  leadScore: number | null;
  painPoints: string[];
  callScript: { opener: string } | null;
  /** ISO timestamp of interview completion. */
  completedAt: string;
};

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// Long enough to be useful in a log line, short enough not to bury it: HubSpot
// validation errors can carry a per-property breakdown running to kilobytes.
const ERROR_BODY_MAX_LENGTH = 500;

function describeError(err: unknown): string {
  if (err instanceof HubSpotApiError) {
    const body = err.body ? ` body=${err.body.slice(0, ERROR_BODY_MAX_LENGTH)}` : "";
    return `${err.message} (status=${err.status})${body}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown HubSpot sync error";
}

// Never throws and never rejects. Every caller is either fire-and-forget on a
// path that must not be disturbed, or an admin route that reports the result
// back to a button, so failure is a value here, not an exception.
export async function syncResponseToHubSpot(input: HubSpotSyncInput): Promise<HubSpotSyncResult> {
  const { supabase, responseId } = input;
  try {
    const client = getHubSpotClientFromEnv();
    if (!client) return { status: "skipped", reason: "HubSpot is not configured" };

    const lead: HubSpotLead = {
      name: input.respondentName,
      email: input.respondentEmail,
      phone: input.respondentPhone,
      company: input.company,
      surveyTitle: input.surveyTitle,
      leadScore: input.leadScore,
      painPoints: formatPainPointList(input.painPoints),
      // Same selection the Slack notification uses, from lib/lead-content.ts.
      callScriptOpener: selectCallScriptOpener(input.callScript),
      responseUrl: `${appUrl()}/admin/responses/${responseId}`,
      interviewDate: input.completedAt,
    };

    const { contactId, dealId } = await syncLeadToHubSpot(client, lead);

    const { error } = await supabase
      .from("responses")
      .update({
        hubspot_contact_id: contactId,
        hubspot_deal_id: dealId,
        hubspot_synced_at: new Date().toISOString(),
      })
      .eq("id", responseId);

    if (error) {
      // The CRM objects exist; only our record of them failed. Reported as a
      // failure because a retry is genuinely wanted: without the ids, the
      // admin page still shows this response as unsynced.
      console.error(
        `[hubspot] response_id=${responseId} synced to HubSpot but the write-back failed: ` +
          `contact=${contactId} deal=${dealId ?? "none"} error=${error.message}`
      );
      return { status: "failed", error: `Synced to HubSpot but could not record it: ${error.message}` };
    }

    console.log(
      `[hubspot] response_id=${responseId} synced contact=${contactId} deal=${dealId ?? "none"}`
    );
    return { status: "synced", contactId, dealId };
  } catch (err) {
    // One structured line carrying the response id and whatever HubSpot said,
    // because this usually runs detached from any request and leaves no other
    // trace anywhere.
    const error = describeError(err);
    console.error(`[hubspot] sync failed response_id=${responseId}: ${error}`);
    return { status: "failed", error };
  }
}
