// HubSpot CRM schema provisioning. Birdsong writes interview results onto
// HubSpot contacts and deals, which means the portal has to carry a handful of
// custom contact properties and a deal pipeline. Rather than documenting those
// as manual setup steps a customer has to click through (and get subtly wrong),
// this module provisions them over the API on first use.
//
// Everything here is idempotent and strictly additive: each ensure* function
// reads what already exists, creates only what is missing, and treats a
// conflict from a concurrent creator as success. Nothing in this file deletes
// or modifies a property, group, or pipeline that already exists — a customer
// portal is their data, not ours, and a property whose label or type someone
// edited by hand stays edited.
//
// No function here reads process.env. The access token arrives as part of a
// HubSpotClient so that today's single HUBSPOT_ACCESS_TOKEN can become a
// per-customer OAuth token later without touching anything below; the only
// place the environment is read is the call site that builds the client.

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Schema provisioning is a handful of small reads and writes, but it runs on
// the critical path of the first sync after a cold start, so it gets a bound.
const HUBSPOT_FETCH_TIMEOUT_MS = 10_000;

export type HubSpotClient = {
  accessToken: string;
  // Overridable so tests can point at a stub without patching global fetch
  // semantics; production callers never pass this.
  baseUrl: string;
};

export function createHubSpotClient(accessToken: string, baseUrl = HUBSPOT_API_BASE): HubSpotClient {
  return { accessToken, baseUrl };
}

// status is 0 for transport-level failures (network error, timeout), where
// there was never an HTTP response to read a status off of.
export class HubSpotApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string = ""
  ) {
    super(message);
    this.name = "HubSpotApiError";
  }
}

// --- What Birdsong needs to exist in the portal -----------------------------

export const BIRDSONG_PROPERTY_GROUP = { name: "birdsong", label: "Birdsong" };

// `type` is the storage type, `fieldType` is how HubSpot renders the input —
// both are required on create and they are not interchangeable (a "string"
// stored as a "textarea" is a multi-line box; as "text" it is a single line).
//
// birdsong_interview_date is a HubSpot `date`, which stores midnight UTC only:
// whatever writes it must send a date, not a full timestamp, or HubSpot
// rejects the value.
export const BIRDSONG_CONTACT_PROPERTIES = [
  {
    name: "birdsong_lead_score",
    label: "Birdsong lead score",
    type: "number",
    fieldType: "number",
  },
  { name: "birdsong_survey", label: "Birdsong survey", type: "string", fieldType: "text" },
  {
    name: "birdsong_pain_points",
    label: "Birdsong pain points",
    type: "string",
    fieldType: "textarea",
  },
  {
    name: "birdsong_response_url",
    label: "Birdsong response URL",
    type: "string",
    fieldType: "text",
  },
  {
    name: "birdsong_interview_date",
    label: "Birdsong interview date",
    type: "date",
    fieldType: "date",
  },
  // Carries the call script opener onto the contact record. This portal has
  // no notes/engagement scopes, so a property is the only place the script can
  // land; a textarea because openers run to several sentences.
  { name: "birdsong_call_script", label: "Call Script", type: "string", fieldType: "textarea" },
] as const;

export const BIRDSONG_PIPELINE_LABEL = "Birdsong Leads";

// Deal stages carry a win probability in metadata; HubSpot wants it as a
// string in [0, 1], and closed stages additionally need isClosed. These are
// only used when the pipeline is created — an existing "Birdsong Leads"
// pipeline whose stages someone renamed or reordered is left exactly as is.
export const BIRDSONG_PIPELINE_STAGES = [
  { label: "New Qualified Lead", probability: "0.2", isClosed: false },
  { label: "Contacted", probability: "0.4", isClosed: false },
  { label: "Meeting Booked", probability: "0.6", isClosed: false },
  { label: "Opportunity", probability: "0.8", isClosed: false },
  { label: "Closed Won", probability: "1.0", isClosed: true },
  { label: "Closed Lost", probability: "0.0", isClosed: true },
];

// The IDs a sync needs once the schema is known to exist. Property and group
// names are fixed constants above, so only the pipeline — whose IDs HubSpot
// generates — is worth carrying around.
export type HubSpotSchema = {
  pipelineId: string;
  // Stage a freshly synced lead lands in: the pipeline's lowest displayOrder
  // stage, which is "New Qualified Lead" for a pipeline we created and
  // whatever the customer put first if they have reordered it.
  firstStageId: string;
};

// --- HTTP ------------------------------------------------------------------

type HubSpotResponse = {
  status: number;
  ok: boolean;
  text: string;
  json: Record<string, unknown> | null;
};

// Throws only when there was no HTTP response at all (network failure,
// timeout). Every real status comes back for the caller to interpret, because
// "409" means success to the create helper and failure to nobody else.
async function hubspotRequest(
  client: HubSpotClient,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<HubSpotResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HUBSPOT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${client.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${client.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    let json: Record<string, unknown> | null = null;
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed && typeof parsed === "object") json = parsed as Record<string, unknown>;
    } catch {
      // Non-JSON body (HTML error page from a proxy, empty 204). The raw text
      // is still carried on the response for error messages.
    }
    return { status: res.status, ok: res.ok, text, json };
  } catch (err) {
    const detail =
      err instanceof Error && err.name === "AbortError"
        ? `timed out after ${HUBSPOT_FETCH_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : "unknown transport error";
    throw new HubSpotApiError(`HubSpot ${method} ${path} failed: ${detail}`, 0);
  } finally {
    clearTimeout(timeout);
  }
}

function requestFailed(method: string, path: string, res: HubSpotResponse): HubSpotApiError {
  const message = typeof res.json?.message === "string" ? res.json.message : res.text.slice(0, 300);
  return new HubSpotApiError(
    `HubSpot ${method} ${path} returned ${res.status}${message ? `: ${message}` : ""}`,
    res.status,
    res.text
  );
}

// The v3 list endpoints used here (contact properties, contact property
// groups, deal pipelines) return the full set in one page — there are dozens
// of these objects in a portal, not thousands — so there is no paging to walk.
async function listResults<T>(client: HubSpotClient, path: string): Promise<T[]> {
  const res = await hubspotRequest(client, "GET", path);
  if (!res.ok) throw requestFailed("GET", path, res);
  const results = res.json?.results;
  return Array.isArray(results) ? (results as T[]) : [];
}

// "Someone else already made this" is the expected outcome of a race between
// two cold starts provisioning the same portal, and HubSpot signals it
// inconsistently: 409 for pipelines, 400 with a conflict category for
// properties. All of them mean the schema is in the state we wanted.
function isConflict(res: HubSpotResponse): boolean {
  if (res.status === 409) return true;
  if (res.status !== 400) return false;
  const category = typeof res.json?.category === "string" ? res.json.category : "";
  if (category === "CONFLICT" || category === "OBJECT_ALREADY_EXISTS") return true;
  return /already exists|duplicate/i.test(res.text);
}

type CreateOutcome = { created: boolean; json: Record<string, unknown> | null };

async function create(
  client: HubSpotClient,
  path: string,
  body: unknown,
  what: string
): Promise<CreateOutcome> {
  const res = await hubspotRequest(client, "POST", path, body);
  if (res.ok) {
    console.log(`[hubspot] created ${what}`);
    return { created: true, json: res.json };
  }
  if (isConflict(res)) {
    console.log(`[hubspot] ${what} already existed (conflict tolerated)`);
    return { created: false, json: null };
  }
  throw requestFailed("POST", path, res);
}

// --- Ensure steps ----------------------------------------------------------

// The group has to exist before the properties that name it, so this is
// awaited ahead of ensureContactProperties rather than run alongside it.
export async function ensureContactPropertyGroup(client: HubSpotClient): Promise<void> {
  const path = "/crm/v3/properties/contacts/groups";
  const groups = await listResults<{ name?: string }>(client, path);
  if (groups.some((g) => g.name === BIRDSONG_PROPERTY_GROUP.name)) return;

  await create(
    client,
    path,
    { ...BIRDSONG_PROPERTY_GROUP, displayOrder: -1 },
    `contact property group "${BIRDSONG_PROPERTY_GROUP.name}"`
  );
}

export async function ensureContactProperties(client: HubSpotClient): Promise<void> {
  const path = "/crm/v3/properties/contacts";
  const existing = new Set(
    (await listResults<{ name?: string }>(client, path))
      .map((p) => p.name)
      .filter((name): name is string => typeof name === "string")
  );

  const missing = BIRDSONG_CONTACT_PROPERTIES.filter((p) => !existing.has(p.name));
  if (missing.length === 0) return;

  // Sequential rather than parallel: at most five calls on a cold start, and
  // one failure shouldn't leave a fan-out of half-reported siblings in flight.
  for (const property of missing) {
    await create(
      client,
      path,
      { ...property, groupName: BIRDSONG_PROPERTY_GROUP.name },
      `contact property "${property.name}"`
    );
  }
}

type HubSpotPipeline = {
  id?: string;
  label?: string;
  stages?: { id?: string; label?: string; displayOrder?: number }[];
};

// Pipelines are matched by label, not name: HubSpot generates pipeline IDs and
// has no stable user-supplied key, so the label is the only thing we can
// recognise our own pipeline by.
function findBirdsongPipeline(pipelines: HubSpotPipeline[]): HubSpotPipeline | undefined {
  return pipelines.find((p) => p.label === BIRDSONG_PIPELINE_LABEL);
}

function toSchema(pipeline: HubSpotPipeline): HubSpotSchema {
  const stages = (pipeline.stages ?? []).filter(
    (s): s is { id: string; displayOrder?: number } => typeof s.id === "string"
  );
  const first = [...stages].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[0];
  if (typeof pipeline.id !== "string" || !first) {
    throw new HubSpotApiError(
      `HubSpot pipeline "${BIRDSONG_PIPELINE_LABEL}" has no usable id or stages`,
      0
    );
  }
  return { pipelineId: pipeline.id, firstStageId: first.id };
}

// Every HubSpot tier below Professional caps a portal at a single deal
// pipeline, so on those portals ours can never be created. The cap is a
// property of the customer's subscription, not a transient error: retrying
// never clears it, and failing the sync over it would mean a Starter portal
// gets nothing at all. Recognised here so the caller can fall back to the
// pipeline the portal already has.
function isPipelineLimitError(err: HubSpotApiError): boolean {
  return /limit of \d+ deal pipeline|maximum pipelines/i.test(`${err.message} ${err.body}`);
}

// The pipeline to put Birdsong deals in when the portal will not accept a new
// one: HubSpot's built-in pipeline (always id "default") if it is still there,
// otherwise whichever pipeline the customer put first.
function fallbackPipeline(pipelines: HubSpotPipeline[]): HubSpotPipeline | undefined {
  return (
    pipelines.find((p) => p.id === "default") ??
    [...pipelines].sort((a, b) => (a.stages?.[0]?.displayOrder ?? 0) - (b.stages?.[0]?.displayOrder ?? 0))[0]
  );
}

export async function ensureDealPipeline(client: HubSpotClient): Promise<HubSpotSchema> {
  const path = "/crm/v3/pipelines/deals";
  const pipelines = await listResults<HubSpotPipeline>(client, path);
  const existing = findBirdsongPipeline(pipelines);
  if (existing) return toSchema(existing);

  let outcome: CreateOutcome;
  try {
    outcome = await create(
      client,
      path,
      {
        // displayOrder is required and must not be negative: -1, which is how
        // a property group pins itself to the top, is rejected outright on a
        // pipeline. Ours goes after whatever the portal already has rather
        // than pushing itself ahead of the customer's own pipelines.
        label: BIRDSONG_PIPELINE_LABEL,
        displayOrder: pipelines.length,
        stages: BIRDSONG_PIPELINE_STAGES.map((stage, index) => ({
          label: stage.label,
          displayOrder: index,
          metadata: { probability: stage.probability, isClosed: String(stage.isClosed) },
        })),
      },
      `deal pipeline "${BIRDSONG_PIPELINE_LABEL}"`
    );
  } catch (err) {
    if (err instanceof HubSpotApiError && isPipelineLimitError(err)) {
      const fallback = fallbackPipeline(pipelines);
      if (fallback) {
        const schema = toSchema(fallback);
        console.warn(
          `[hubspot] portal is capped at one deal pipeline, so "${BIRDSONG_PIPELINE_LABEL}" cannot be ` +
            `created; putting Birdsong deals in the existing "${fallback.label}" pipeline ` +
            `(${schema.pipelineId}) instead`
        );
        return schema;
      }
    }
    throw err;
  }
  if (outcome.created && outcome.json) return toSchema(outcome.json as HubSpotPipeline);

  // Conflict: another process created the pipeline between our read and our
  // write, so its IDs are only discoverable by reading again.
  const after = findBirdsongPipeline(await listResults<HubSpotPipeline>(client, path));
  if (!after) {
    throw new HubSpotApiError(
      `HubSpot rejected creating pipeline "${BIRDSONG_PIPELINE_LABEL}" as a conflict but it does not exist`,
      409
    );
  }
  return toSchema(after);
}

// --- Memoized entry point --------------------------------------------------

// Keyed by token (and base URL) rather than held in a single module-level
// promise: once tokens are per-customer OAuth rather than one shared
// environment variable, a global memo would hand customer B the pipeline IDs
// provisioned in customer A's portal. Keying by the credential makes that
// impossible by construction, and with a single token today it behaves exactly
// like the single promise it replaces — one provisioning pass per cold start.
// Two memos rather than one, because the two halves of the schema are needed
// at different moments and one of them is allowed to be unavailable. Contact
// properties must exist before any contact is written; the deal pipeline is
// only consulted for a lead that clears the score threshold. Provisioning them
// together meant a portal that cannot host our pipeline synced nothing at all,
// not even contacts.
const contactSchemaByClient = new Map<string, Promise<void>>();
const dealSchemaByClient = new Map<string, Promise<HubSpotSchema>>();

function cacheKey(client: HubSpotClient): string {
  return `${client.baseUrl}\n${client.accessToken}`;
}

// A rejected attempt is evicted rather than cached: a warm Fluid Compute
// instance can live for hours, and a single timeout or 429 shouldn't
// permanently disable sync for the life of the process. So provisioning runs
// at most once per cold start once it has succeeded, and retries on the next
// sync until then.
function memoize<T>(
  store: Map<string, Promise<T>>,
  client: HubSpotClient,
  provision: () => Promise<T>
): Promise<T> {
  const key = cacheKey(client);
  const cached = store.get(key);
  if (cached) return cached;

  const pending = provision().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, pending);
  return pending;
}

// Call this before writing a contact. Concurrent callers on a cold start share
// the one in-flight promise, and later callers get the cached result without
// touching the network.
export function ensureContactSchema(client: HubSpotClient): Promise<void> {
  return memoize(contactSchemaByClient, client, async () => {
    await ensureContactPropertyGroup(client);
    await ensureContactProperties(client);
    console.log("[hubspot] contact properties ready");
  });
}

// Call this before creating a deal, not before a sync: on a portal capped at
// one deal pipeline this resolves to the customer's existing pipeline, and on
// a portal where even that fails it rejects, which must not stop the contact
// half of the sync from having happened.
export function ensureDealSchema(client: HubSpotClient): Promise<HubSpotSchema> {
  return memoize(dealSchemaByClient, client, async () => {
    const schema = await ensureDealPipeline(client);
    console.log(
      `[hubspot] deal schema ready: pipeline=${schema.pipelineId} first_stage=${schema.firstStageId}`
    );
    return schema;
  });
}

// Test-only: the memos are process-global, so tests that exercise provisioning
// more than once have to clear them between cases.
export function resetHubSpotSchemaCache(): void {
  contactSchemaByClient.clear();
  dealSchemaByClient.clear();
}

// --- Syncing a completed interview -----------------------------------------

// Deals are only worth opening for leads the sales team would actually work.
// Numerically the same cutoff the Slack notification uses today, but kept as
// its own constant: "loud enough to interrupt someone in Slack" and "worth a
// row in the CRM pipeline" are separate policies that should be free to move
// apart.
export const HUBSPOT_DEAL_SCORE_MIN = 7;

// Already-assembled content, not raw insight columns: what counts as the top
// pain point or the call script opener is decided once in lib/lead-content.ts
// and shared with the Slack notification, so this module never grows a second
// opinion about it.
export type HubSpotLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  surveyTitle: string;
  leadScore: number | null;
  /** Every pain point, preformatted for a textarea. */
  painPoints: string | null;
  callScriptOpener: string | null;
  responseUrl: string;
  /** ISO timestamp of interview completion. */
  interviewDate: string;
};

// HubSpot `date` properties store midnight UTC and reject a full timestamp,
// so the completion time is narrowed to its calendar date. Returns null for an
// unparseable input rather than sending HubSpot something it will 400 on.
function toHubSpotDate(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

// "Ada Lovelace King" splits to firstname "Ada", lastname "Lovelace King" —
// first space only, because compound surnames are far more common than
// compound given names. A single-word name leaves lastname empty, which is
// dropped by omitEmpty below rather than written as "".
function splitName(name: string | null): { firstname?: string; lastname?: string } {
  const trimmed = name?.trim();
  if (!trimmed) return {};
  const spaceAt = trimmed.indexOf(" ");
  if (spaceAt === -1) return { firstname: trimmed };
  return { firstname: trimmed.slice(0, spaceAt), lastname: trimmed.slice(spaceAt + 1).trim() };
}

// HubSpot treats an empty string as "clear this field", so a lead missing a
// phone number would erase the phone number already on a matched contact.
// Anything absent is omitted from the payload instead, making a sync purely
// additive against data the customer already has.
function omitEmpty(properties: Record<string, string | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

function contactProperties(lead: HubSpotLead): Record<string, string> {
  const { firstname, lastname } = splitName(lead.name);
  return omitEmpty({
    firstname,
    lastname,
    email: lead.email?.trim(),
    phone: lead.phone?.trim(),
    birdsong_lead_score: typeof lead.leadScore === "number" ? String(lead.leadScore) : undefined,
    birdsong_survey: lead.surveyTitle,
    birdsong_pain_points: lead.painPoints,
    birdsong_call_script: lead.callScriptOpener,
    birdsong_response_url: lead.responseUrl,
    birdsong_interview_date: toHubSpotDate(lead.interviewDate),
  });
}

// HubSpot's own wording when a create collides with an existing contact:
// "Contact already exists. Existing ID: 12345". The ID is the only way to
// reach that contact, so it is worth parsing out of the prose.
function existingIdFromConflict(res: HubSpotResponse): string | null {
  const message = typeof res.json?.message === "string" ? res.json.message : res.text;
  const match = /Existing ID:\s*(\d+)/i.exec(message);
  return match ? match[1] : null;
}

function objectId(json: Record<string, unknown> | null, what: string): string {
  const id = json?.id;
  if (typeof id !== "string" && typeof id !== "number") {
    throw new HubSpotApiError(`HubSpot returned no id for ${what}`, 0, JSON.stringify(json ?? null));
  }
  return String(id);
}

// Finds the contact by email and updates it, or creates one when there is no
// match. Never deletes or blanks a property (see omitEmpty). Returns the
// contact id either way.
export async function upsertContact(client: HubSpotClient, lead: HubSpotLead): Promise<string> {
  const properties = contactProperties(lead);
  const email = lead.email?.trim();

  // No email means no way to recognise a returning respondent, so this
  // creates rather than risking a match on name alone. Accepted consequence:
  // an anonymous respondent who interviews twice becomes two contacts.
  const existingId = email ? await findContactIdByEmail(client, email) : null;

  if (existingId) {
    const path = `/crm/v3/objects/contacts/${existingId}`;
    const res = await hubspotRequest(client, "PATCH", path, { properties });
    if (!res.ok) throw requestFailed("PATCH", path, res);
    console.log(`[hubspot] updated contact ${existingId}`);
    return existingId;
  }

  const path = "/crm/v3/objects/contacts";
  const res = await hubspotRequest(client, "POST", path, { properties });
  if (res.ok) {
    const id = objectId(res.json, "the created contact");
    console.log(`[hubspot] created contact ${id}`);
    return id;
  }

  // Lost a race, or the contact existed under an email the search index had
  // not caught up on. Either way HubSpot hands back the id it collided with,
  // so the update still happens.
  if (isConflict(res)) {
    const conflictId = existingIdFromConflict(res);
    if (conflictId) {
      const patchPath = `/crm/v3/objects/contacts/${conflictId}`;
      const patch = await hubspotRequest(client, "PATCH", patchPath, { properties });
      if (!patch.ok) throw requestFailed("PATCH", patchPath, patch);
      console.log(`[hubspot] updated contact ${conflictId} after create conflict`);
      return conflictId;
    }
  }
  throw requestFailed("POST", path, res);
}

// The search index is eventually consistent: a contact created seconds ago
// may not be findable yet. That is what the create-conflict path in
// upsertContact is for, rather than something to retry around here.
async function findContactIdByEmail(client: HubSpotClient, email: string): Promise<string | null> {
  const path = "/crm/v3/objects/contacts/search";
  const res = await hubspotRequest(client, "POST", path, {
    filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
    properties: ["email"],
    limit: 1,
  });
  if (!res.ok) throw requestFailed("POST", path, res);

  const results = res.json?.results;
  const first = Array.isArray(results) ? (results[0] as { id?: unknown } | undefined) : undefined;
  if (!first || (typeof first.id !== "string" && typeof first.id !== "number")) return null;
  return String(first.id);
}

// Association type 3 is HubSpot's built-in deal-to-contact association. It is
// a fixed platform constant, not a portal-specific id, so it needs no
// provisioning alongside the pipeline.
const DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID = 3;

// Hyphen rather than an em dash: this string is written into a HubSpot record
// and read back through exports, filters and search boxes that treat the two
// as different characters.
export function buildDealName(lead: Pick<HubSpotLead, "company" | "name">, leadScore: number): string {
  const subject = lead.company?.trim() || lead.name?.trim() || "Anonymous respondent";
  return `${subject} - Birdsong (${leadScore}/10)`;
}

export async function createDeal(
  client: HubSpotClient,
  schema: HubSpotSchema,
  contactId: string,
  lead: HubSpotLead,
  leadScore: number
): Promise<string> {
  const path = "/crm/v3/objects/deals";
  const res = await hubspotRequest(client, "POST", path, {
    properties: {
      dealname: buildDealName(lead, leadScore),
      pipeline: schema.pipelineId,
      dealstage: schema.firstStageId,
    },
    // Associated at creation rather than in a second call: a deal that exists
    // but is attached to nobody is worse than no deal at all.
    associations: [
      {
        to: { id: contactId },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID,
          },
        ],
      },
    ],
  });
  if (!res.ok) throw requestFailed("POST", path, res);

  const id = objectId(res.json, "the created deal");
  console.log(`[hubspot] created deal ${id} for contact ${contactId}`);
  return id;
}

export type HubSpotSyncIds = { contactId: string; dealId: string | null };

// One completed interview into HubSpot: contact properties (memoized, so only
// the first sync of a cold start pays for it), then the contact, then a deal
// if the lead scored well enough.
//
// Throws if the contact cannot be synced. Callers that must not fail — every
// caller today — go through syncResponseToHubSpot in lib/hubspot-sync.ts,
// which contains the error and records the outcome.
export async function syncLeadToHubSpot(
  client: HubSpotClient,
  lead: HubSpotLead
): Promise<HubSpotSyncIds> {
  await ensureContactSchema(client);
  const contactId = await upsertContact(client, lead);

  if (typeof lead.leadScore !== "number" || lead.leadScore < HUBSPOT_DEAL_SCORE_MIN) {
    return { contactId, dealId: null };
  }

  // A contact that already synced is not rolled back if the deal fails, and
  // the failure is not propagated either: the contact is the durable record
  // and the caller can only persist ids it is handed, so throwing here would
  // discard a contact that really does exist in the CRM. Logged loudly instead
  // — a null deal id on a lead above the threshold is the signal to look here.
  try {
    const schema = await ensureDealSchema(client);
    const dealId = await createDeal(client, schema, contactId, lead, lead.leadScore);
    return { contactId, dealId };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[hubspot] contact ${contactId} synced but its deal could not be created: ${detail}`
    );
    return { contactId, dealId: null };
  }
}
