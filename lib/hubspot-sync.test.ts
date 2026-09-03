import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncResponseToHubSpot, type HubSpotSyncInput } from "@/lib/hubspot-sync";
import { resetHubSpotSchemaCache } from "@/lib/hubspot";

// Records what the sync wrote back to the responses row, and can be told to
// fail that write.
function stubSupabase(options: { updateError?: string } = {}) {
  const updates: { values: Record<string, unknown>; id: string }[] = [];
  const supabase = {
    from: () => ({
      update: (values: Record<string, unknown>) => ({
        eq: async (_column: string, id: string) => {
          updates.push({ values, id });
          return { error: options.updateError ? { message: options.updateError } : null };
        },
      }),
    }),
  };
  return { updates, client: supabase as unknown as HubSpotSyncInput["supabase"] };
}

// Every HubSpot endpoint answers success unless `fail` says otherwise.
function stubHubSpotApi(options: { fail?: { status: number; body: unknown } } = {}) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (options.fail) {
      return response(options.fail.status, options.fail.body);
    }
    const path = new URL(url).pathname;
    const method = init.method ?? "GET";
    if (method === "GET") return response(200, { results: [] });
    if (path === "/crm/v3/pipelines/deals") {
      return response(201, {
        id: "pipeline-1",
        label: "Birdsong Leads",
        stages: [{ id: "stage-1", displayOrder: 0 }],
      });
    }
    if (path === "/crm/v3/objects/contacts/search") return response(200, { results: [] });
    if (path === "/crm/v3/objects/contacts") return response(201, { id: "contact-1" });
    if (path === "/crm/v3/objects/deals") return response(201, { id: "deal-1" });
    return response(201, {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function input(overrides: Partial<HubSpotSyncInput> = {}): HubSpotSyncInput {
  const { client } = stubSupabase();
  return {
    supabase: client,
    responseId: "response-1",
    surveyTitle: "Ops research",
    respondentName: "Jordan Lee",
    respondentEmail: "jordan.lee@acme.com",
    respondentPhone: null,
    company: "Acme Corp",
    leadScore: 9,
    painPoints: ["Manual reconciliation", "Dispatch delays"],
    callScript: { opener: "You mentioned reconciling spreadsheets by hand." },
    completedAt: "2026-08-14T09:30:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  resetHubSpotSchemaCache();
  process.env.HUBSPOT_ACCESS_TOKEN = "token-abc";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.HUBSPOT_ACCESS_TOKEN;
});

describe("syncResponseToHubSpot", () => {
  it("records the contact and deal ids on the response row", async () => {
    stubHubSpotApi();
    const db = stubSupabase();

    const result = await syncResponseToHubSpot(input({ supabase: db.client }));

    expect(result).toEqual({ status: "synced", contactId: "contact-1", dealId: "deal-1", advancedTo: null });
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].id).toBe("response-1");
    expect(db.updates[0].values).toMatchObject({
      hubspot_contact_id: "contact-1",
      hubspot_deal_id: "deal-1",
    });
    expect(typeof db.updates[0].values.hubspot_synced_at).toBe("string");
  });

  it("records a null deal id for a lead below the deal threshold", async () => {
    stubHubSpotApi();
    const db = stubSupabase();

    const result = await syncResponseToHubSpot(input({ supabase: db.client, leadScore: 4 }));

    expect(result).toEqual({ status: "synced", contactId: "contact-1", dealId: null, advancedTo: null });
    expect(db.updates[0].values.hubspot_deal_id).toBeNull();
  });

  describe("the fire-and-forget error path", () => {
    it("returns a failure instead of throwing when HubSpot errors", async () => {
      stubHubSpotApi({ fail: { status: 500, body: { message: "Internal error" } } });
      const db = stubSupabase();

      // The completion path calls this without a catch of its own; rejecting
      // here would surface as an unhandled rejection in a detached task.
      const result = await syncResponseToHubSpot(input({ supabase: db.client }));

      expect(result.status).toBe("failed");
      expect(db.updates).toEqual([]);
    });

    it("logs exactly one structured error carrying the response id and HubSpot's body", async () => {
      stubHubSpotApi({ fail: { status: 400, body: { message: "Property does not exist" } } });

      await syncResponseToHubSpot(input({ responseId: "response-42" }));

      const errors = vi.mocked(console.error).mock.calls;
      expect(errors).toHaveLength(1);
      const line = String(errors[0][0]);
      expect(line).toContain("response_id=response-42");
      expect(line).toContain("Property does not exist");
      expect(line).not.toMatch(/—/);
    });

    it("reports a failure when the CRM write succeeded but the write-back did not", async () => {
      stubHubSpotApi();
      const db = stubSupabase({ updateError: "column does not exist" });

      const result = await syncResponseToHubSpot(input({ supabase: db.client }));

      expect(result.status).toBe("failed");
    });

    it("never rejects even if the supabase client itself throws", async () => {
      stubHubSpotApi();
      const exploding = {
        from: () => {
          throw new Error("connection lost");
        },
      } as unknown as HubSpotSyncInput["supabase"];

      await expect(syncResponseToHubSpot(input({ supabase: exploding }))).resolves.toMatchObject({
        status: "failed",
      });
    });
  });

  describe("when HUBSPOT_ACCESS_TOKEN is missing", () => {
    it("skips without throwing and without calling HubSpot", async () => {
      // Fresh module instance: the missing-token warning is once-per-process.
      vi.resetModules();
      delete process.env.HUBSPOT_ACCESS_TOKEN;
      const fetchMock = stubHubSpotApi();
      const db = stubSupabase();
      const { syncResponseToHubSpot: fresh } = await import("@/lib/hubspot-sync");

      const first = await fresh(input({ supabase: db.client }));
      const second = await fresh(input({ supabase: db.client }));

      expect(first.status).toBe("skipped");
      expect(second.status).toBe("skipped");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(db.updates).toEqual([]);
      // Warned once for the process, not once per completed interview.
      expect(vi.mocked(console.warn).mock.calls).toHaveLength(1);
    });
  });
});
