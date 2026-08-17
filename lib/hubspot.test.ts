import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BIRDSONG_CONTACT_PROPERTIES,
  BIRDSONG_PIPELINE_LABEL,
  BIRDSONG_PROPERTY_GROUP,
  buildDealName,
  createHubSpotClient,
  ensureContactSchema,
  ensureDealSchema,
  resetHubSpotSchemaCache,
  syncLeadToHubSpot,
  upsertContact,
  type HubSpotLead,
} from "@/lib/hubspot";

const BASE = "https://hubspot.test";
const GROUPS = "/crm/v3/properties/contacts/groups";
const PROPERTIES = "/crm/v3/properties/contacts";
const PIPELINES = "/crm/v3/pipelines/deals";
const CONTACTS = "/crm/v3/objects/contacts";
const CONTACT_SEARCH = "/crm/v3/objects/contacts/search";
const DEALS = "/crm/v3/objects/deals";

type Call = { method: string; path: string; body: Record<string, unknown> };

// Minimal stand-in for the three HubSpot endpoints this module touches.
// `state` is what the portal already contains; `overrides` forces a specific
// response for a POST so conflict and failure paths can be exercised.
function stubHubSpot(options: {
  groups?: string[];
  properties?: string[];
  pipelines?: Record<string, unknown>[];
  /** Contacts the search endpoint reports as matching the searched email. */
  contactSearchResults?: Record<string, unknown>[];
  postResponse?: (path: string, callIndex: number) => { status: number; body?: unknown } | undefined;
}) {
  const calls: Call[] = [];
  const groups = (options.groups ?? []).map((name) => ({ name }));
  const properties = (options.properties ?? []).map((name) => ({ name }));
  const pipelines = options.pipelines ?? [];

  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const path = url.replace(BASE, "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body as string) : {};
    calls.push({ method, path, body });

    if (method === "GET") {
      const results =
        path === GROUPS ? groups : path === PROPERTIES ? properties : path === PIPELINES ? pipelines : [];
      return jsonResponse(200, { results });
    }

    const forced = options.postResponse?.(path, calls.filter((c) => c.method !== "GET").length - 1);
    if (forced) return jsonResponse(forced.status, forced.body ?? {});

    // Object writes: HubSpot answers with the object's own id.
    if (method === "PATCH") return jsonResponse(200, { id: path.split("/").pop() });
    if (path === CONTACT_SEARCH) return jsonResponse(200, { results: options.contactSearchResults ?? [] });
    if (path === CONTACTS) return jsonResponse(201, { id: "contact-new" });
    if (path === DEALS) return jsonResponse(201, { id: "deal-new" });

    // Default: the create succeeds and HubSpot echoes the object back.
    if (path === PIPELINES) {
      return jsonResponse(201, {
        id: "pipeline-new",
        label: body.label,
        stages: (body.stages as { label: string; displayOrder: number }[]).map((s, i) => ({
          id: `stage-${i}`,
          label: s.label,
          displayOrder: s.displayOrder,
        })),
      });
    }
    return jsonResponse(201, body);
  });

  vi.stubGlobal("fetch", fetchMock);
  return {
    calls,
    posts: () => calls.filter((c) => c.method === "POST"),
    writes: (path: string) => calls.filter((c) => c.method !== "GET" && c.path === path),
    patches: () => calls.filter((c) => c.method === "PATCH"),
  };
}

function jsonResponse(status: number, body: unknown) {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response;
}

function client() {
  return createHubSpotClient("token-abc", BASE);
}

const ALL_PROPERTY_NAMES = BIRDSONG_CONTACT_PROPERTIES.map((p) => p.name);

beforeEach(() => {
  resetHubSpotSchemaCache();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ensureContactSchema", () => {
  it("provisions the group and every property in an empty portal", async () => {
    const stub = stubHubSpot({});

    await ensureContactSchema(client());

    const posts = stub.posts();
    expect(posts.filter((c) => c.path === GROUPS)).toHaveLength(1);
    expect(posts.filter((c) => c.path === PROPERTIES).map((c) => c.body.name)).toEqual(
      ALL_PROPERTY_NAMES
    );
  });

  it("never touches the deal pipeline, which contacts do not depend on", async () => {
    const stub = stubHubSpot({});

    await ensureContactSchema(client());

    expect(stub.calls.filter((c) => c.path === PIPELINES)).toEqual([]);
  });

  it("puts every created property in the birdsong group with its declared types", async () => {
    const stub = stubHubSpot({});

    await ensureContactSchema(client());

    const created = stub.posts().filter((c) => c.path === PROPERTIES);
    for (const call of created) {
      expect(call.body.groupName).toBe(BIRDSONG_PROPERTY_GROUP.name);
    }
    expect(created.map((c) => [c.body.name, c.body.type, c.body.fieldType])).toEqual([
      ["birdsong_lead_score", "number", "number"],
      ["birdsong_survey", "string", "text"],
      ["birdsong_pain_points", "string", "textarea"],
      ["birdsong_response_url", "string", "text"],
      ["birdsong_interview_date", "date", "date"],
      ["birdsong_call_script", "string", "textarea"],
    ]);
  });

  it("creates only the missing properties and leaves existing ones alone", async () => {
    const stub = stubHubSpot({
      groups: [BIRDSONG_PROPERTY_GROUP.name, "sales_stuff"],
      properties: ["email", "birdsong_lead_score", "birdsong_survey"],
    });

    await ensureContactSchema(client());

    expect(stub.posts().filter((c) => c.path === PROPERTIES).map((c) => c.body.name)).toEqual([
      "birdsong_pain_points",
      "birdsong_response_url",
      "birdsong_interview_date",
      "birdsong_call_script",
    ]);
    expect(stub.posts().filter((c) => c.path === GROUPS)).toEqual([]);
  });

  it("treats a 409 on the group and a 400 already-exists on a property as success", async () => {
    stubHubSpot({
      postResponse: (path) => {
        if (path === GROUPS) return { status: 409, body: { message: "Group already exists" } };
        if (path === PROPERTIES)
          return { status: 400, body: { category: "CONFLICT", message: "Property already exists" } };
        return undefined;
      },
    });

    await expect(ensureContactSchema(client())).resolves.toBeUndefined();
  });

  describe("memoization", () => {
    it("provisions once for concurrent callers and reuses the result afterwards", async () => {
      const stub = stubHubSpot({});

      await Promise.all([ensureContactSchema(client()), ensureContactSchema(client())]);
      await ensureContactSchema(client());

      expect(stub.posts().filter((c) => c.path === GROUPS)).toHaveLength(1);
    });

    it("does not cache a failure, so the next sync retries", async () => {
      let attempts = 0;
      stubHubSpot({
        postResponse: (path) => {
          if (path !== GROUPS) return undefined;
          attempts += 1;
          return attempts === 1 ? { status: 500, body: { message: "boom" } } : undefined;
        },
      });

      await expect(ensureContactSchema(client())).rejects.toThrow(/returned 500/);
      await expect(ensureContactSchema(client())).resolves.toBeUndefined();
    });
  });
});

describe("ensureDealSchema", () => {
  it("creates the pipeline with the six Birdsong stages in order", async () => {
    const stub = stubHubSpot({});

    const schema = await ensureDealSchema(client());

    expect(schema).toEqual({ pipelineId: "pipeline-new", firstStageId: "stage-0" });

    const post = stub.posts().find((c) => c.path === PIPELINES);
    expect(post?.body.label).toBe(BIRDSONG_PIPELINE_LABEL);
    expect((post?.body.stages as { label: string }[]).map((s) => s.label)).toEqual([
      "New Qualified Lead",
      "Contacted",
      "Meeting Booked",
      "Opportunity",
      "Closed Won",
      "Closed Lost",
    ]);
  });

  // HubSpot requires displayOrder on a pipeline and rejects a negative value,
  // so it can be neither omitted nor set to -1 the way a property group's is.
  it("appends after the portal's existing pipelines with a non-negative displayOrder", async () => {
    const stub = stubHubSpot({
      pipelines: [
        { id: "default", label: "Sales Pipeline", stages: [{ id: "s1", displayOrder: 0 }] },
        { id: "other", label: "Partner Pipeline", stages: [{ id: "s2", displayOrder: 0 }] },
      ],
    });

    await ensureDealSchema(client());

    const post = stub.posts().find((c) => c.path === PIPELINES);
    expect(post?.body.displayOrder).toBe(2);
  });

  it("sets displayOrder to 0 in a portal with no pipelines at all", async () => {
    const stub = stubHubSpot({});

    await ensureDealSchema(client());

    expect(stub.posts().find((c) => c.path === PIPELINES)?.body.displayOrder).toBe(0);
  });

  it("writes nothing when the pipeline already exists", async () => {
    const stub = stubHubSpot({
      pipelines: [
        {
          id: "pipeline-1",
          label: BIRDSONG_PIPELINE_LABEL,
          stages: [{ id: "stage-a", displayOrder: 0 }],
        },
      ],
    });

    const schema = await ensureDealSchema(client());

    expect(schema).toEqual({ pipelineId: "pipeline-1", firstStageId: "stage-a" });
    expect(stub.posts()).toEqual([]);
  });

  it("ignores unrelated pipelines instead of adopting one", async () => {
    const stub = stubHubSpot({
      pipelines: [{ id: "sales", label: "Sales Pipeline", stages: [{ id: "s1", displayOrder: 0 }] }],
    });

    const schema = await ensureDealSchema(client());

    expect(schema.pipelineId).toBe("pipeline-new");
    expect(stub.posts().filter((c) => c.path === PIPELINES)).toHaveLength(1);
  });

  it("takes the lowest displayOrder stage as the first stage, not the array order", async () => {
    stubHubSpot({
      pipelines: [
        {
          id: "pipeline-1",
          label: BIRDSONG_PIPELINE_LABEL,
          stages: [
            { id: "stage-contacted", displayOrder: 1 },
            { id: "stage-new", displayOrder: 0 },
          ],
        },
      ],
    });

    const schema = await ensureDealSchema(client());

    expect(schema.firstStageId).toBe("stage-new");
  });

  describe("a portal capped at one deal pipeline", () => {
    // What HubSpot actually answers on a Starter portal, both errors at once.
    const PIPELINE_LIMIT = {
      status: 400,
      body: {
        status: "error",
        message: "Error validating request.",
        category: "VALIDATION_ERROR",
        errors: [
          {
            message: "You have reached your limit of 1 deal pipelines.",
            context: { "maximum pipelines": ["1"] },
          },
        ],
      },
    };

    it("falls back to the portal's built-in pipeline instead of failing", async () => {
      const stub = stubHubSpot({
        pipelines: [
          {
            id: "default",
            label: "Sales Pipeline",
            stages: [
              { id: "qualifiedtobuy", displayOrder: 1 },
              { id: "appointmentscheduled", displayOrder: 0 },
            ],
          },
        ],
        postResponse: (path) => (path === PIPELINES ? PIPELINE_LIMIT : undefined),
      });

      const schema = await ensureDealSchema(client());

      expect(schema).toEqual({ pipelineId: "default", firstStageId: "appointmentscheduled" });
      expect(stub.posts().filter((c) => c.path === PIPELINES)).toHaveLength(1);
    });

    it("still throws when the cap is hit and there is no pipeline to fall back to", async () => {
      stubHubSpot({
        pipelines: [],
        postResponse: (path) => (path === PIPELINES ? PIPELINE_LIMIT : undefined),
      });

      await expect(ensureDealSchema(client())).rejects.toThrow(/returned 400/);
    });

    it("does not mistake an unrelated 400 for the pipeline cap", async () => {
      stubHubSpot({
        pipelines: [{ id: "default", label: "Sales Pipeline", stages: [{ id: "s1", displayOrder: 0 }] }],
        postResponse: (path) =>
          path === PIPELINES ? { status: 400, body: { message: "Stage label required" } } : undefined,
      });

      await expect(ensureDealSchema(client())).rejects.toThrow(/Stage label required/);
    });
  });

  describe("conflicts from a concurrent provisioner", () => {
    it("re-reads the pipeline after a 409 to recover the IDs it never saw", async () => {
      const created = {
        id: "pipeline-racer",
        label: BIRDSONG_PIPELINE_LABEL,
        stages: [{ id: "stage-racer", displayOrder: 0 }],
      };
      const pipelines: Record<string, unknown>[] = [];
      stubHubSpot({
        pipelines,
        postResponse: (path) => {
          if (path !== PIPELINES) return undefined;
          // The other process wins the race: our create conflicts, and by the
          // time we read again the pipeline is there.
          pipelines.push(created);
          return { status: 409, body: { message: "Pipeline label already in use" } };
        },
      });

      await expect(ensureDealSchema(client())).resolves.toEqual({
        pipelineId: "pipeline-racer",
        firstStageId: "stage-racer",
      });
    });
  });

  describe("memoization", () => {
    it("provisions once for concurrent callers and reuses the result afterwards", async () => {
      const stub = stubHubSpot({});

      const [a, b] = await Promise.all([ensureDealSchema(client()), ensureDealSchema(client())]);
      const c = await ensureDealSchema(client());

      expect(a).toEqual(b);
      expect(c).toEqual(a);
      expect(stub.posts().filter((call) => call.path === PIPELINES)).toHaveLength(1);
    });

    it("keys the cache by token so a second portal is provisioned separately", async () => {
      const stub = stubHubSpot({});

      await ensureDealSchema(createHubSpotClient("token-a", BASE));
      await ensureDealSchema(createHubSpotClient("token-b", BASE));

      expect(stub.posts().filter((call) => call.path === PIPELINES)).toHaveLength(2);
    });

    it("does not cache a failure, so the next sync retries", async () => {
      let attempts = 0;
      stubHubSpot({
        postResponse: (path) => {
          if (path !== PIPELINES) return undefined;
          attempts += 1;
          return attempts === 1 ? { status: 500, body: { message: "boom" } } : undefined;
        },
      });

      await expect(ensureDealSchema(client())).rejects.toThrow(/returned 500/);
      await expect(ensureDealSchema(client())).resolves.toMatchObject({
        pipelineId: "pipeline-new",
      });
    });
  });
});

function lead(overrides: Partial<HubSpotLead> = {}): HubSpotLead {
  return {
    name: "Jordan Lee",
    email: "jordan.lee@acme.com",
    phone: "+1 555-0100",
    company: "Acme Corp",
    surveyTitle: "Ops research",
    leadScore: 8,
    painPoints: "- Manual reconciliation\n- Dispatch delays",
    callScriptOpener: "You mentioned your team burns hours reconciling spreadsheets.",
    responseUrl: "https://app.test/admin/responses/r1",
    interviewDate: "2026-08-14T09:30:00.000Z",
    ...overrides,
  };
}

describe("upsertContact", () => {
  it("updates the matched contact when the email is already in the portal", async () => {
    const stub = stubHubSpot({ contactSearchResults: [{ id: "contact-77" }] });

    const id = await upsertContact(client(), lead());

    expect(id).toBe("contact-77");
    expect(stub.patches().map((c) => c.path)).toEqual([`${CONTACTS}/contact-77`]);
    // Matched means updated, never a second contact for the same person.
    expect(stub.writes(CONTACTS)).toEqual([]);
  });

  it("creates a contact when the email matches nothing", async () => {
    const stub = stubHubSpot({ contactSearchResults: [] });

    const id = await upsertContact(client(), lead());

    expect(id).toBe("contact-new");
    expect(stub.writes(CONTACTS)).toHaveLength(1);
    expect(stub.patches()).toEqual([]);
  });

  it("searches on the lead's email", async () => {
    const stub = stubHubSpot({});

    await upsertContact(client(), lead({ email: "someone@example.com" }));

    const search = stub.writes(CONTACT_SEARCH)[0];
    expect(search.body).toMatchObject({
      filterGroups: [
        { filters: [{ propertyName: "email", operator: "EQ", value: "someone@example.com" }] },
      ],
    });
  });

  it("skips the search and creates when there is no email to match on", async () => {
    const stub = stubHubSpot({});

    const id = await upsertContact(client(), lead({ email: null }));

    expect(id).toBe("contact-new");
    expect(stub.writes(CONTACT_SEARCH)).toEqual([]);
  });

  it("writes the Birdsong properties, splitting the name on the first space", async () => {
    const stub = stubHubSpot({});

    await upsertContact(client(), lead({ name: "Ada Lovelace King" }));

    expect(stub.writes(CONTACTS)[0].body.properties).toEqual({
      firstname: "Ada",
      lastname: "Lovelace King",
      email: "jordan.lee@acme.com",
      phone: "+1 555-0100",
      birdsong_lead_score: "8",
      birdsong_survey: "Ops research",
      birdsong_pain_points: "- Manual reconciliation\n- Dispatch delays",
      birdsong_call_script: "You mentioned your team burns hours reconciling spreadsheets.",
      birdsong_response_url: "https://app.test/admin/responses/r1",
      // A HubSpot date property, so the completion timestamp narrows to its
      // calendar date.
      birdsong_interview_date: "2026-08-14",
    });
  });

  it("omits absent fields rather than sending empty strings that would clear them", async () => {
    const stub = stubHubSpot({});

    await upsertContact(
      client(),
      lead({ name: "Cher", phone: null, leadScore: null, callScriptOpener: null, painPoints: null })
    );

    const properties = stub.writes(CONTACTS)[0].body.properties as Record<string, string>;
    expect(properties).not.toHaveProperty("phone");
    expect(properties).not.toHaveProperty("lastname");
    expect(properties).not.toHaveProperty("birdsong_lead_score");
    expect(properties).not.toHaveProperty("birdsong_pain_points");
    expect(properties).not.toHaveProperty("birdsong_call_script");
    expect(properties.firstname).toBe("Cher");
  });

  it("updates the colliding contact when a create loses a race", async () => {
    const stub = stubHubSpot({
      postResponse: (path) =>
        path === CONTACTS
          ? { status: 409, body: { message: "Contact already exists. Existing ID: 4242" } }
          : undefined,
    });

    const id = await upsertContact(client(), lead());

    expect(id).toBe("4242");
    expect(stub.patches().map((c) => c.path)).toEqual([`${CONTACTS}/4242`]);
  });
});

describe("buildDealName", () => {
  it("prefers the company, falls back to the respondent, then to anonymous", () => {
    expect(buildDealName({ company: "Acme Corp", name: "Jordan Lee" }, 9)).toBe(
      "Acme Corp - Birdsong (9/10)"
    );
    expect(buildDealName({ company: null, name: "Jordan Lee" }, 7)).toBe(
      "Jordan Lee - Birdsong (7/10)"
    );
    expect(buildDealName({ company: null, name: null }, 8)).toBe(
      "Anonymous respondent - Birdsong (8/10)"
    );
  });

  it("separates with a hyphen, never an em dash", () => {
    expect(buildDealName({ company: "Acme Corp", name: null }, 9)).not.toMatch(/—/);
  });
});

describe("syncLeadToHubSpot", () => {
  it("creates a deal in the Birdsong pipeline associated to the contact", async () => {
    const stub = stubHubSpot({ contactSearchResults: [{ id: "contact-77" }] });

    const result = await syncLeadToHubSpot(client(), lead({ leadScore: 9 }));

    expect(result).toEqual({ contactId: "contact-77", dealId: "deal-new" });
    const deal = stub.writes(DEALS)[0];
    expect(deal.body).toMatchObject({
      properties: {
        dealname: "Acme Corp - Birdsong (9/10)",
        pipeline: "pipeline-new",
        dealstage: "stage-0",
      },
      associations: [
        {
          to: { id: "contact-77" },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        },
      ],
    });
  });

  it("syncs the contact but opens no deal below the score threshold", async () => {
    const stub = stubHubSpot({});

    const result = await syncLeadToHubSpot(client(), lead({ leadScore: 6 }));

    expect(result).toEqual({ contactId: "contact-new", dealId: null });
    expect(stub.writes(DEALS)).toEqual([]);
    expect(stub.writes(CONTACTS)).toHaveLength(1);
  });

  it("opens a deal exactly at the threshold", async () => {
    const stub = stubHubSpot({});

    const result = await syncLeadToHubSpot(client(), lead({ leadScore: 7 }));

    expect(result.dealId).toBe("deal-new");
    expect(stub.writes(DEALS)).toHaveLength(1);
  });

  it("opens no deal for an unscored lead", async () => {
    const stub = stubHubSpot({});

    const result = await syncLeadToHubSpot(client(), lead({ leadScore: null }));

    expect(result.dealId).toBeNull();
    expect(stub.writes(DEALS)).toEqual([]);
  });

  it("provisions the contact properties before writing the contact", async () => {
    const stub = stubHubSpot({});

    await syncLeadToHubSpot(client(), lead());

    const firstObjectWrite = stub.calls.findIndex((c) => c.path.startsWith("/crm/v3/objects/"));
    const lastPropertyWrite = stub.calls.map((c) => c.path).lastIndexOf(PROPERTIES);
    expect(lastPropertyWrite).toBeGreaterThanOrEqual(0);
    expect(lastPropertyWrite).toBeLessThan(firstObjectWrite);
  });

  it("does not touch the deal pipeline for a lead below the threshold", async () => {
    const stub = stubHubSpot({});

    await syncLeadToHubSpot(client(), lead({ leadScore: 3 }));

    expect(stub.calls.filter((c) => c.path === PIPELINES)).toEqual([]);
  });

  it("keeps the contact when the deal cannot be created", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const stub = stubHubSpot({
      contactSearchResults: [{ id: "contact-77" }],
      postResponse: (path) =>
        path === PIPELINES ? { status: 500, body: { message: "pipeline exploded" } } : undefined,
    });

    // The contact is the durable record: a deal failure must not discard it,
    // because the caller can only persist ids it is handed.
    const result = await syncLeadToHubSpot(client(), lead({ leadScore: 9 }));

    expect(result).toEqual({ contactId: "contact-77", dealId: null });
    expect(stub.patches().map((c) => c.path)).toEqual([`${CONTACTS}/contact-77`]);
  });
});
