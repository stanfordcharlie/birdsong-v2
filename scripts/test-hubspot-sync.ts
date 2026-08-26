/**
 * End-to-end exercise of the HubSpot sync path without running an interview.
 *
 *   npm run hubspot:sync-smoke-test -- --name "Ada Lovelace" --email ada@example.com --score 8
 *
 * Inserts a fake completed response row, calls syncResponseToHubSpot the exact
 * way app/api/interview/continue/route.ts does, reads the row back, reads the
 * contact and deal back out of the HubSpot API, and exits non-zero if anything
 * about the outcome is wrong.
 *
 * Why this script exists in this shape: the production sync fails open. It is
 * fire-and-forget from a waitUntil task, syncResponseToHubSpot returns failure
 * as a *value* rather than throwing, syncLeadToHubSpot swallows a failed deal
 * creation entirely (contact synced, dealId null, one console.error and no
 * other trace), and an unconfigured token is a silent skip. So "it didn't
 * throw" proves nothing here. Everything below is built to make those three
 * quiet failure modes loud: console.error is intercepted for the duration of
 * the sync and any line captured fails the run, a missing token is a hard
 * error rather than a skip, and the assertions read the database row and the
 * CRM rather than trusting the return value.
 *
 * Reads (never writes) lib/hubspot-sync.ts and lib/hubspot.ts. Does not touch
 * sync behaviour.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { inspect } from "node:util";

// Must run before anything reads process.env. Nothing imported below reads the
// environment at module scope (getHubSpotClientFromEnv reads it per call), but
// the load stays first so that stops being a thing to remember.
loadEnvFile(path.join(process.cwd(), ".env.local"));

import { createClient } from "@supabase/supabase-js";
import { BIRDSONG_CONTACT_PROPERTIES, HUBSPOT_DEAL_SCORE_MIN } from "@/lib/hubspot";
import { getHubSpotClientFromEnv, syncResponseToHubSpot } from "@/lib/hubspot-sync";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Database, Json } from "@/types/database";

// --- Environment -----------------------------------------------------------

// Deliberately not `dotenv`: this is the only consumer, next dev loads
// .env.local itself, and a dependency for fifteen lines is not worth it.
// Existing process.env values win, so `HUBSPOT_ACCESS_TOKEN=... npm run
// hubspot:sync-smoke-test` still points the run at a different portal.
function loadEnvFile(file: string): void {
  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    return; // Fine: the required-variable check below reports what is missing.
  }
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name: string, why: string): string {
  const value = process.env[name];
  if (!value) {
    fatal(
      `${name} is not set (${why}).\n` +
        `   Add it to .env.local or pass it inline: ${name}=... npm run hubspot:sync-smoke-test`
    );
  }
  return value;
}

// --- Output ----------------------------------------------------------------

const BAR = "─".repeat(76);

function heading(title: string): void {
  console.log(`\n${BAR}\n${title}\n${BAR}`);
}

function fatal(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

// This script is not read-only: it inserts a row into `responses` and creates
// a real contact and deal in whatever HubSpot portal the token belongs to.
// Neither is undone on exit. Pointed at production by an unset or forgotten
// NEXT_PUBLIC_APP_URL, that is live CRM data and a real lead row, so the
// target has to be proven local rather than assumed. ALLOW_PRODUCTION_WRITE=1
// is the deliberate override for the case where writing to a real portal is
// the actual intent.
function assertWritableTarget(): void {
  if (process.env.ALLOW_PRODUCTION_WRITE === "1") {
    console.warn(
      "\n⚠️  ALLOW_PRODUCTION_WRITE=1 — writing to a non-local target on purpose.\n" +
        "   This creates a real response row and a real HubSpot contact and deal.\n"
    );
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  // Unset is not treated as local. The app defaults it to localhost, but the
  // default is the app's, not this script's, and inheriting it here would
  // make "I forgot to set it" indistinguishable from "I meant localhost".
  let host: string | null = null;
  if (appUrl) {
    try {
      host = new URL(appUrl).hostname;
    } catch {
      host = null;
    }
  }

  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  if (isLocal) return;

  fatal(
    `Refusing to run: this script writes real data and the target is not local.\n\n` +
      `   NEXT_PUBLIC_APP_URL is ${appUrl ? `"${appUrl}"` : "not set"}.\n\n` +
      `   It inserts a row into \`responses\` and creates a HubSpot contact and deal,\n` +
      `   and neither is cleaned up afterwards.\n\n` +
      `   Point it at local:   NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run hubspot:sync-smoke-test\n` +
      `   Or override on purpose:  ALLOW_PRODUCTION_WRITE=1 npm run hubspot:sync-smoke-test`
  );
}

function fmt(args: unknown[]): string {
  return args
    .map((a) =>
      a instanceof Error ? (a.stack ?? a.message) : typeof a === "string" ? a : inspect(a, { depth: 4 })
    )
    .join(" ");
}

// --- Arguments -------------------------------------------------------------

type Args = {
  name: string;
  email: string;
  /** null exercises the unscored branch, which must not open a deal. */
  score: number | null;
  surveyRef: string | null;
  isTest: boolean;
};

const USAGE = `
Usage: npm run hubspot:sync-smoke-test -- [options]

  --name  <string>     Respondent name         (default: "Birdsong Sync Test")
  --email <string>     Respondent email        (default: test+<timestamp>@example.com)
  --score <0-10|none>  Lead score              (default: 8; "none" writes NULL)
  --survey <id|slug>   Survey to attach to     (default: newest active survey)
  --real               Insert with is_test=false, so the row shows up in the
                       admin leads list exactly like a real completed interview
                       (default: is_test=true, to keep fake rows out of it)
  --help
`;

function parseArgs(argv: string[]): Args {
  const args: Args = {
    name: "Birdsong Sync Test",
    email: `test+${Date.now()}@example.com`,
    score: 8,
    surveyRef: null,
    isTest: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) fatal(`${flag} needs a value.\n${USAGE}`);
      return value;
    };
    switch (flag) {
      case "--help":
      case "-h":
        console.log(USAGE);
        process.exit(0);
      // eslint-disable-next-line no-fallthrough
      case "--name":
        args.name = next();
        break;
      case "--email":
        args.email = next();
        break;
      case "--survey":
        args.surveyRef = next();
        break;
      case "--real":
        args.isTest = false;
        break;
      case "--score": {
        const raw = next();
        if (raw === "none" || raw === "null") {
          args.score = null;
          break;
        }
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) {
          fatal(`--score must be an integer 0-10, or "none" for NULL. Got: ${raw}`);
        }
        args.score = parsed;
        break;
      }
      default:
        fatal(`Unknown argument: ${flag}\n${USAGE}`);
    }
  }
  return args;
}

// --- Fake interview content ------------------------------------------------

// Shaped like something extractInterviewInsights would actually have produced,
// because the sync formats all of it (pain points into a textarea, the call
// script opener onto its own property) and an empty-ish row would let a
// formatting regression pass unnoticed.
const FAKE_MESSAGES: InterviewMessage[] = [
  {
    role: "assistant",
    content: "Thanks for making the time. To start — what does your team own day to day?",
  },
  {
    role: "user",
    content:
      "I run revenue operations for a 240-person B2B software company. My team owns the CRM, the reporting stack, and everything between marketing handoff and closed-won.",
  },
  {
    role: "assistant",
    content: "Where does that break down today?",
  },
  {
    role: "user",
    content:
      "Data quality, mostly. Reps enter call notes inconsistently, so half our pipeline reviews turn into arguing about whether a deal is real instead of what to do about it.",
  },
  {
    role: "assistant",
    content: "What has that cost you concretely?",
  },
  {
    role: "user",
    content:
      "We blew our Q2 forecast by about 18% and nobody caught it until the last two weeks. I spend maybe six hours a week hand-cleaning records before the exec meeting.",
  },
  {
    role: "assistant",
    content: "Have you tried to fix it?",
  },
  {
    role: "user",
    content:
      "We bought a data enrichment tool last year that nobody adopted. The blocker is that it added work for reps rather than removing it.",
  },
  {
    role: "assistant",
    content: "If this were solved, who else would need to sign off on buying something?",
  },
  {
    role: "user",
    content:
      "Me and our CRO. I own the budget line up to about $40k, above that it goes to finance. We're actively looking at this in the next quarter.",
  },
];

const FAKE_PAIN_POINTS = [
  "Inconsistent CRM data entry makes pipeline reviews unreliable",
  "Missed Q2 forecast by ~18% with no early warning",
  "Six hours a week of manual record cleanup before exec reporting",
  "Previous enrichment tool failed adoption because it added rep workload",
];

const FAKE_CALL_SCRIPT = {
  opener:
    "You mentioned pipeline reviews turn into arguing about whether a deal is real — I'd like to show you how teams your size stop that argument before the meeting starts.",
  talkingPoints: [
    "Missed forecast by 18% with no early warning signal",
    "Six hours a week of manual cleanup, owned by the RevOps lead personally",
    "Prior tool failed on adoption, not capability — lead with zero rep workload",
    "Budget authority to $40k, CRO co-signs above that",
  ],
};

const FAKE_CUSTOM_FIELD_VALUES = {
  company: "Northwind Analytics",
  job_title: "Director of Revenue Operations",
  email_domain: "northwindanalytics.com",
};

const FAKE_SUMMARY =
  "RevOps director at a 240-person B2B software company. CRM data quality is breaking " +
  "forecast accuracy — missed Q2 by 18%. Owns budget to $40k, evaluating in the next quarter.";

const FAKE_FIT_REASON =
  "Owns the problem and the budget, has an active timeline, and has already failed with a " +
  "point solution — a strong fit for a workflow-first pitch.";

// --- HubSpot read-back -----------------------------------------------------

type HubSpotFetch = { ok: boolean; status: number; json: unknown; text: string };

// A direct read of what actually landed in the CRM. The sync only hands back
// ids, so this is the only way to see whether the properties it claims to have
// written are really populated.
async function hubspotGet(
  client: { accessToken: string; baseUrl: string },
  path: string
): Promise<HubSpotFetch> {
  const res = await fetch(`${client.baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${client.accessToken}` },
  });
  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body; the raw text is printed instead.
  }
  return { ok: res.ok, status: res.status, json, text };
}

function printFetch(label: string, path: string, res: HubSpotFetch): void {
  console.log(`\n${label}`);
  console.log(`GET ${path} → ${res.status} ${res.ok ? "OK" : "FAILED"}`);
  console.log(res.json ? JSON.stringify(res.json, null, 2) : res.text || "(empty body)");
}

/**
 * Reports every birdsong_* property the integration defines as populated or
 * empty. The list comes from BIRDSONG_CONTACT_PROPERTIES rather than being
 * copied here, so adding a property to lib/hubspot.ts adds it to this report.
 */
function reportBirdsongProperties(contactJson: unknown): void {
  const properties =
    (contactJson as { properties?: Record<string, unknown> } | null)?.properties ?? {};

  console.log(
    `\nbirdsong_* properties (${BIRDSONG_CONTACT_PROPERTIES.length} defined in lib/hubspot.ts):`
  );

  const populated: string[] = [];
  const empty: string[] = [];

  for (const property of BIRDSONG_CONTACT_PROPERTIES) {
    const value = properties[property.name];
    const isEmpty = value === undefined || value === null || String(value).trim() === "";
    if (isEmpty) {
      empty.push(property.name);
      console.log(`  ✗ EMPTY      ${property.name}`);
    } else {
      populated.push(property.name);
      const text = String(value).replace(/\s+/g, " ");
      const preview = text.length > 90 ? `${text.slice(0, 90)}…` : text;
      console.log(`  ✓ POPULATED  ${property.name} = ${preview}`);
    }
  }

  console.log(`\n  populated: ${populated.length}/${BIRDSONG_CONTACT_PROPERTIES.length}` +
    (empty.length ? `   empty: ${empty.join(", ")}` : ""));
}

// --- Main ------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Before anything reads a credential or opens a connection: .env.local is
  // already loaded at module scope above, so this sees the real target.
  assertWritableTarget();

  heading("1. Environment");

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "needed to reach the database");
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "the script inserts and reads a response row directly, bypassing RLS"
  );
  // Checked here rather than left to the sync: an unset token makes
  // syncResponseToHubSpot return {status:"skipped"} with a single warn, which
  // is precisely the silent no-op this script exists to rule out.
  requireEnv(
    "HUBSPOT_ACCESS_TOKEN",
    "without it the sync skips itself silently and this test would prove nothing"
  );

  const hubspotClient = getHubSpotClientFromEnv();
  if (!hubspotClient) fatal("getHubSpotClientFromEnv() returned null despite HUBSPOT_ACCESS_TOKEN being set.");

  console.log(`supabase:  ${supabaseUrl}`);
  console.log(`hubspot:   ${hubspotClient.baseUrl} (token ...${process.env.HUBSPOT_ACCESS_TOKEN!.slice(-6)})`);
  console.log(`app url:   ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000 (default)"}`);

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Survey to hang the response off of ---------------------------------

  heading("2. Survey");

  let surveyQuery = supabase.from("surveys").select("id, slug, title").limit(1);
  if (args.surveyRef) {
    // A UUID is an id, anything else is a slug — the two never collide.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.surveyRef);
    surveyQuery = isUuid ? surveyQuery.eq("id", args.surveyRef) : surveyQuery.eq("slug", args.surveyRef);
  } else {
    surveyQuery = surveyQuery.is("archived_at", null).order("created_at", { ascending: false });
  }

  const { data: survey, error: surveyError } = await surveyQuery.maybeSingle();
  if (surveyError) fatal(`Could not read the surveys table: ${surveyError.message}`);
  if (!survey) {
    fatal(
      args.surveyRef
        ? `No survey matches "${args.surveyRef}".`
        : "No unarchived survey exists to attach a test response to. Create one, or pass --survey <id|slug>."
    );
  }
  console.log(`using survey ${survey.id} (${survey.slug}) — "${survey.title}"`);

  // --- Insert the fake completed response ---------------------------------

  heading("3. Insert fake completed response");

  const completedAt = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("responses")
    .insert({
      survey_id: survey.id,
      respondent_name: args.name,
      respondent_email: args.email,
      respondent_phone: "+1 555 0142",
      messages: FAKE_MESSAGES as unknown as Json,
      pain_points: FAKE_PAIN_POINTS as unknown as Json,
      lead_score: args.score,
      fit_reason: FAKE_FIT_REASON,
      summary: FAKE_SUMMARY,
      call_script: {
        opener: FAKE_CALL_SCRIPT.opener,
        talking_points: FAKE_CALL_SCRIPT.talkingPoints,
      } as unknown as Json,
      custom_field_values: FAKE_CUSTOM_FIELD_VALUES as unknown as Json,
      completed: true,
      source: "test-hubspot-sync",
      is_test: args.isTest,
      // user_id is filled in by the set_response_user_id trigger.
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    fatal(`Insert into responses failed: ${insertError?.message ?? "no row returned"}`);
  }

  const responseId = inserted.id;
  console.log(`inserted response ${responseId}`);
  console.log(`  name:      ${args.name}`);
  console.log(`  email:     ${args.email}`);
  console.log(`  score:     ${args.score ?? "NULL"}`);
  console.log(`  is_test:   ${args.isTest}${args.isTest ? " (pass --real to insert as a real lead)" : ""}`);
  console.log(`  messages:  ${FAKE_MESSAGES.length}   pain points: ${FAKE_PAIN_POINTS.length}`);

  // --- Run the sync exactly as the interview completion path does ---------

  heading("4. syncResponseToHubSpot");

  // Same derivation app/api/interview/continue/route.ts does before calling
  // the sync, so the company that reaches HubSpot is the one production would
  // have sent.
  const customValues = FAKE_CUSTOM_FIELD_VALUES as Record<string, unknown>;
  const respondentCompanyName =
    typeof customValues.company === "string"
      ? customValues.company
      : typeof customValues.derived_company_name === "string"
        ? customValues.derived_company_name
        : null;

  // The sync's whole contract is that it never throws, which means every real
  // problem inside it leaves only a console line behind. syncLeadToHubSpot in
  // particular catches a failed deal creation and returns dealId:null after a
  // single console.error. Intercepting the console for the duration of the
  // call is the only way to see those; they are replayed at the end and each
  // one fails the run.
  const swallowedErrors: string[] = [];
  const warnings: string[] = [];
  const realError = console.error;
  const realWarn = console.warn;
  console.error = (...a: unknown[]) => {
    swallowedErrors.push(fmt(a));
    realError("  [console.error]", ...a);
  };
  console.warn = (...a: unknown[]) => {
    warnings.push(fmt(a));
    realWarn("  [console.warn] ", ...a);
  };

  const startedAt = Date.now();
  let syncResult: Awaited<ReturnType<typeof syncResponseToHubSpot>>;
  try {
    syncResult = await syncResponseToHubSpot({
      supabase,
      responseId,
      surveyTitle: survey.title,
      respondentName: args.name,
      respondentEmail: args.email,
      respondentPhone: "+1 555 0142",
      company: respondentCompanyName,
      leadScore: args.score,
      painPoints: FAKE_PAIN_POINTS,
      callScript: FAKE_CALL_SCRIPT,
      completedAt,
    });
  } finally {
    console.error = realError;
    console.warn = realWarn;
  }
  const elapsedMs = Date.now() - startedAt;

  console.log(`\nreturned after ${elapsedMs}ms: ${JSON.stringify(syncResult)}`);

  // --- Read the row back --------------------------------------------------

  heading("5. Row after sync");

  const { data: row, error: readError } = await supabase
    .from("responses")
    .select("hubspot_contact_id, hubspot_deal_id, hubspot_synced_at")
    .eq("id", responseId)
    .single();

  if (readError || !row) {
    fatal(`Could not re-read response ${responseId}: ${readError?.message ?? "no row returned"}`);
  }

  console.log(`hubspot_contact_id:  ${row.hubspot_contact_id ?? "NULL"}`);
  console.log(`hubspot_deal_id:     ${row.hubspot_deal_id ?? "NULL"}`);
  console.log(`hubspot_synced_at:   ${row.hubspot_synced_at ?? "NULL"}`);

  // --- Read the CRM objects back ------------------------------------------

  heading("6. HubSpot API read-back");

  let contactFetch: HubSpotFetch | null = null;
  if (row.hubspot_contact_id) {
    const properties = [
      "firstname",
      "lastname",
      "email",
      "phone",
      ...BIRDSONG_CONTACT_PROPERTIES.map((p) => p.name),
    ].join(",");
    const contactPath = `/crm/v3/objects/contacts/${row.hubspot_contact_id}?properties=${properties}`;
    contactFetch = await hubspotGet(hubspotClient, contactPath);
    printFetch("CONTACT", contactPath, contactFetch);
    reportBirdsongProperties(contactFetch.json);
  } else {
    console.log("CONTACT: no hubspot_contact_id on the row, nothing to fetch.");
  }

  let dealFetch: HubSpotFetch | null = null;
  if (row.hubspot_deal_id) {
    const dealPath =
      `/crm/v3/objects/deals/${row.hubspot_deal_id}` +
      `?properties=dealname,pipeline,dealstage,amount,createdate&associations=contacts`;
    dealFetch = await hubspotGet(hubspotClient, dealPath);
    printFetch("DEAL", dealPath, dealFetch);
  } else {
    console.log(
      `\nDEAL: no hubspot_deal_id on the row` +
        (args.score === null || args.score < HUBSPOT_DEAL_SCORE_MIN
          ? ` — expected, score ${args.score ?? "NULL"} is below the ${HUBSPOT_DEAL_SCORE_MIN} threshold.`
          : ` — NOT expected at score ${args.score}.`)
    );
  }

  // --- Verdict ------------------------------------------------------------

  heading("7. Result");

  const failures: string[] = [];
  const dealExpected = args.score !== null && args.score >= HUBSPOT_DEAL_SCORE_MIN;

  if (syncResult.status !== "synced") {
    failures.push(
      syncResult.status === "skipped"
        ? `sync reported status="skipped" (${syncResult.reason}) — nothing was written to HubSpot`
        : `sync reported status="failed": ${syncResult.error}`
    );
  }

  // Any error the sync logged is by definition one it swallowed: it returns
  // failure as a value and its callers ignore it, so nothing downstream would
  // ever have noticed these.
  for (const line of swallowedErrors) {
    failures.push(`the sync logged and swallowed an error: ${line}`);
  }

  if (!row.hubspot_contact_id) failures.push("hubspot_contact_id is NULL — required at any score");
  if (!row.hubspot_synced_at) failures.push("hubspot_synced_at is NULL — required at any score");

  if (
    syncResult.status === "synced" &&
    row.hubspot_contact_id &&
    syncResult.contactId !== row.hubspot_contact_id
  ) {
    failures.push(
      `contact id mismatch: sync returned ${syncResult.contactId} but the row holds ${row.hubspot_contact_id}`
    );
  }

  if (dealExpected && !row.hubspot_deal_id) {
    failures.push(
      `hubspot_deal_id is NULL at score ${args.score} — a deal is required at ${HUBSPOT_DEAL_SCORE_MIN}+`
    );
  }
  if (!dealExpected && row.hubspot_deal_id) {
    failures.push(
      `hubspot_deal_id is ${row.hubspot_deal_id} at score ${args.score ?? "NULL"} — must be NULL below ${HUBSPOT_DEAL_SCORE_MIN}`
    );
  }

  if (row.hubspot_contact_id && !contactFetch?.ok) {
    failures.push(
      `HubSpot does not return contact ${row.hubspot_contact_id} (status ${contactFetch?.status ?? "no response"})`
    );
  }
  if (row.hubspot_deal_id && !dealFetch?.ok) {
    failures.push(
      `HubSpot does not return deal ${row.hubspot_deal_id} (status ${dealFetch?.status ?? "no response"})`
    );
  }

  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} warning(s) logged during the sync (not failures):`);
    for (const line of warnings) console.log(`   - ${line}`);
  }

  console.log(`\nresponse row:  ${responseId}`);
  console.log(`clean up with: delete from responses where id = '${responseId}';`);

  if (failures.length) {
    console.error(`\n❌ FAIL — ${failures.length} problem(s):\n`);
    for (const failure of failures) console.error(`   • ${failure}`);
    console.error("");
    process.exit(1);
  }

  console.log(
    `\n✅ PASS — contact ${row.hubspot_contact_id}, ` +
      `deal ${row.hubspot_deal_id ?? "NULL (correct below threshold)"}, ` +
      `synced at ${row.hubspot_synced_at}\n`
  );
}

// Nothing here is allowed to fail quietly either.
process.on("unhandledRejection", (reason) => {
  console.error("\n❌ Unhandled rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("\n❌ Uncaught exception:", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("\n❌ test-hubspot-sync failed:", err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
