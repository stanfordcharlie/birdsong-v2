// The Instantly API, reduced to the one call Birdsong makes: move a lead out
// of a campaign into a list. Structured like lib/hubspot.ts: nothing here
// reads process.env, the key arrives on a client object, and the base URL
// is overridable so a test can point it at a stub.
//
// Unlike the HubSpot module this never throws. The only caller is the
// interview completion path, where a thrown error is a bug and a failed
// move is an ordinary outcome to record on the prospect and fix by hand in
// Instantly. So the result is a value, either way.

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v2";

// The call is awaited inside completion, before the respondent gets their
// closing message. Five seconds is the most that turn may wait on Instantly.
const INSTANTLY_FETCH_TIMEOUT_MS = 5_000;

// Long enough to say what went wrong, short enough to fit in a table cell's
// tooltip and a log line. Same bound lib/hubspot-sync.ts uses.
const ERROR_BODY_MAX_LENGTH = 500;

export type InstantlyClient = {
  apiKey: string;
  baseUrl: string;
};

export function createInstantlyClient(apiKey: string, baseUrl = INSTANTLY_API_BASE): InstantlyClient {
  return { apiKey, baseUrl };
}

export type RemoveProspectResult = { ok: true; jobId: string | null } | { ok: false; error: string };

// POST /leads/move. Moves `email` from the campaign into the list and
// returns the background job Instantly starts for it. Any 2xx is success:
// the job runs on their side and there is nothing to wait on.
//
// The error string is what lands in prospects.instantly_error: status and
// body for an HTTP failure, the failure kind for a transport one, each
// truncated. Never the key, never a header.
export async function removeProspectFromCampaign(
  client: InstantlyClient,
  { email, campaignId, toListId }: { email: string; campaignId: string; toListId: string }
): Promise<RemoveProspectResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INSTANTLY_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${client.baseUrl}/leads/move`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${client.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ campaign: campaignId, contacts: [email], to_list_id: toListId }),
      signal: controller.signal,
    });

    const body = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, error: `status=${res.status} body=${body.slice(0, ERROR_BODY_MAX_LENGTH)}` };
    }
    return { ok: true, jobId: extractJobId(body) };
  } catch (err) {
    if (controller.signal.aborted) {
      return { ok: false, error: `timeout after ${INSTANTLY_FETCH_TIMEOUT_MS}ms` };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `network error: ${message.slice(0, ERROR_BODY_MAX_LENGTH)}` };
  } finally {
    clearTimeout(timer);
  }
}

// The move response is a background job object. Its id is worth keeping so
// a failed or slow move can be looked up in Instantly, but its exact shape
// is theirs to change, so this reads defensively and settles for null.
function extractJobId(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.id === "string") return obj.id;
    if (typeof obj.job_id === "string") return obj.job_id;
    const job = obj.job;
    if (typeof job === "object" && job !== null && typeof (job as Record<string, unknown>).id === "string") {
      return (job as Record<string, unknown>).id as string;
    }
    return null;
  } catch {
    return null;
  }
}
