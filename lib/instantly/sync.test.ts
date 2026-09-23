import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstantlyClient, removeProspectFromCampaign } from "./client";
import { moveCompletedProspectOutOfCampaign } from "./sync";

// The contract the completion path relies on: neither function ever throws
// or hangs, every failure comes back as a value, and the prospect row is
// written only for the two real outcomes.

const ARGS = { email: "a@example.com", campaignId: "camp_1", toListId: "list_1" };

describe("removeProspectFromCampaign", () => {
  const client = createInstantlyClient("key", "https://stub.invalid/api/v2");

  afterEach(() => vi.unstubAllGlobals());

  it("treats any 2xx as success and keeps the job id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "job_9" }), { status: 202 })));
    expect(await removeProspectFromCampaign(client, ARGS)).toEqual({ ok: true, jobId: "job_9" });
  });

  it("succeeds with a null job id when the body has none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 200 })));
    expect(await removeProspectFromCampaign(client, ARGS)).toEqual({ ok: true, jobId: null });
  });

  it("reports a non-2xx as status plus truncated body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(900), { status: 422 })));
    const result = await removeProspectFromCampaign(client, ARGS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.startsWith("status=422 body=")).toBe(true);
      expect(result.error.length).toBe("status=422 body=".length + 500);
    }
  });

  it("reports a network error without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await removeProspectFromCampaign(client, ARGS)).toEqual({ ok: false, error: "network error: fetch failed" });
  });

  it("aborts at the timeout and reports it", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    ));
    const pending = removeProspectFromCampaign(client, ARGS);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toEqual({ ok: false, error: "timeout after 5000ms" });
    vi.useRealTimers();
  });

  it("sends the documented body and bearer header", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await removeProspectFromCampaign(client, ARGS);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://stub.invalid/api/v2/leads/move");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key");
    expect(JSON.parse(init.body as string)).toEqual({ campaign: "camp_1", contacts: ["a@example.com"], to_list_id: "list_1" });
  });
});

// A fake just deep enough for the two queries the seam runs.
function fakeSupabase(prospect: { email: string; instantly_removed_at: string | null } | null) {
  const updates: Array<Record<string, unknown>> = [];
  const supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: prospect, error: null }) }) }),
      update: (values: Record<string, unknown>) => ({ eq: async () => { updates.push(values); return { error: null }; } }),
    }),
  };
  return { supabase: supabase as never, updates };
}

describe("moveCompletedProspectOutOfCampaign", () => {
  beforeEach(() => {
    vi.stubEnv("INSTANTLY_API_KEY", "key");
    vi.stubEnv("INSTANTLY_COMPLETED_LIST_ID", "list_1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips without a prospect, a campaign, or configuration, writing nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, updates } = fakeSupabase({ email: "a@example.com", instantly_removed_at: null });

    expect(await moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: null, campaignId: "c" }))
      .toEqual({ status: "skipped", reason: "no_prospect" });
    expect(await moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: "p", campaignId: null }))
      .toEqual({ status: "skipped", reason: "no_campaign" });
    vi.stubEnv("INSTANTLY_API_KEY", "");
    expect(await moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: "p", campaignId: "c" }))
      .toEqual({ status: "skipped", reason: "not_configured" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("skips an already-removed prospect without calling Instantly", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, updates } = fakeSupabase({ email: "a@example.com", instantly_removed_at: "2026-09-01T00:00:00Z" });
    expect(await moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: "p", campaignId: "c" }))
      .toEqual({ status: "skipped", reason: "already_removed" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("records a success on the prospect and clears any old error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "job_1" }), { status: 200 })));
    const { supabase, updates } = fakeSupabase({ email: "a@example.com", instantly_removed_at: null });
    expect(await moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: "p", campaignId: "c" }))
      .toEqual({ status: "moved", jobId: "job_1" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ instantly_job_id: "job_1", instantly_error: null });
    expect(typeof updates[0].instantly_removed_at).toBe("string");
  });

  it("records a failure on the prospect and leaves removed_at alone", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const { supabase, updates } = fakeSupabase({ email: "a@example.com", instantly_removed_at: null });
    expect(await moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: "p", campaignId: "c" }))
      .toEqual({ status: "failed", error: "status=500 body=nope" });
    expect(updates).toEqual([{ instantly_error: "status=500 body=nope" }]);
  });

  it("returns a failure value even if the client itself blows up", async () => {
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("boom"); }));
    const { supabase } = fakeSupabase({ email: "a@example.com", instantly_removed_at: null });
    await expect(
      moveCompletedProspectOutOfCampaign({ supabase, responseId: "r", prospectId: "p", campaignId: "c" })
    ).resolves.toMatchObject({ status: "failed" });
  });
});
