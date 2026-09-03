/**
 * Removes a study seeded by scripts/seed-responses.ts, and its responses.
 *
 *   npx tsx scripts/seed-cleanup.ts --slug=<slug> --dry-run   # prove it out
 *   npx tsx scripts/seed-cleanup.ts --slug=<slug>             # actually delete
 *
 * Reads scripts/seed-cleanup/<slug>.json, the manifest the seeder writes, and
 * deletes exactly what is named in it. Nothing is discovered at delete time:
 * every id comes from the manifest, and every delete is additionally scoped to
 * the manifest's survey_id and user_id, so a wrong or hand-edited slug removes
 * nothing rather than removing something else.
 *
 * Order matters and is not left to the database. `responses.survey_id` does
 * cascade, but deleting the survey first would take the response rows with it
 * before anything had confirmed which ones they were, and the run would have
 * no way to report what it actually removed. So: responses by explicit id
 * first, then the survey, then the manifest is rewritten with what remains.
 *
 * --dry-run reads the manifest, resolves every id against the database, prints
 * exactly what a real run would delete, and writes nothing.
 */

import { readFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";

loadEnvFile(path.join(process.cwd(), ".env.local"));

import { createClient } from "@supabase/supabase-js";
import { cleanupManifestPath, type CleanupManifest } from "./seed-responses";
import type { Database } from "@/types/database";

// --- Environment -----------------------------------------------------------

function loadEnvFile(file: string): void {
  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    return;
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) fatal(`${name} is not set. Add it to .env.local or pass it inline.`);
  return value;
}

const BAR = "─".repeat(76);

function heading(title: string): void {
  console.log(`\n${BAR}\n${title}\n${BAR}`);
}

function fatal(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validates the manifest as untrusted input: it is a file on disk that a
// person can edit, and every field in it becomes part of a delete filter.
function parseManifest(raw: string, expectedSlug: string): CleanupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fatal(`Manifest is not valid JSON: ${(err as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object") fatal("Manifest is not a JSON object.");

  const m = parsed as Partial<CleanupManifest>;
  if (typeof m.slug !== "string" || !m.slug) fatal("Manifest is missing a string `slug`.");
  if (m.slug !== expectedSlug) {
    fatal(`Manifest slug "${m.slug}" does not match the requested slug "${expectedSlug}".`);
  }
  if (typeof m.survey_id !== "string" || !UUID_PATTERN.test(m.survey_id)) {
    fatal("Manifest `survey_id` is missing or is not a UUID.");
  }
  if (typeof m.user_id !== "string" || !UUID_PATTERN.test(m.user_id)) {
    fatal("Manifest `user_id` is missing or is not a UUID.");
  }
  if (!Array.isArray(m.response_ids) || m.response_ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
    fatal("Manifest `response_ids` must be an array of UUIDs.");
  }
  const duplicates = m.response_ids.length - new Set(m.response_ids).size;
  if (duplicates > 0) fatal(`Manifest \`response_ids\` contains ${duplicates} duplicate id(s).`);

  return {
    slug: m.slug,
    survey_id: m.survey_id,
    user_id: m.user_id,
    response_ids: m.response_ids,
    seeded_at: typeof m.seeded_at === "string" ? m.seeded_at : "",
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const slugArg = argv.find((a) => a.startsWith("--slug="));
  if (!slugArg) {
    fatal("Pass --slug=<slug>.\n   npx tsx scripts/seed-cleanup.ts --slug=<slug> --dry-run");
  }
  const slug = slugArg.slice("--slug=".length);

  const manifestPath = cleanupManifestPath(slug);
  if (!existsSync(manifestPath)) fatal(`No cleanup manifest at ${path.relative(process.cwd(), manifestPath)}`);

  heading(dryRun ? "Cleanup dry run" : "Cleanup");
  console.log(`Manifest: ${path.relative(process.cwd(), manifestPath)}`);

  const manifest = parseManifest(readFileSync(manifestPath, "utf8"), slug);
  console.log(`  slug:          ${manifest.slug}`);
  console.log(`  survey_id:     ${manifest.survey_id}`);
  console.log(`  user_id:       ${manifest.user_id}`);
  console.log(`  response_ids:  ${manifest.response_ids.length}`);
  console.log(`  seeded_at:     ${manifest.seeded_at || "(not recorded)"}`);
  console.log("  ✓ manifest is well-formed");

  const supabase = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  // --- resolve everything the manifest names, before touching anything ---
  heading("Resolving against the database");

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, slug, title, user_id, status")
    .eq("id", manifest.survey_id)
    .maybeSingle();
  if (surveyError) fatal(`survey lookup failed: ${surveyError.message}`);

  if (!survey) {
    console.log(`Survey ${manifest.survey_id}: already gone.`);
  } else {
    if (survey.slug !== manifest.slug) {
      fatal(`Survey ${survey.id} has slug "${survey.slug}", but the manifest says "${manifest.slug}". Refusing.`);
    }
    if (survey.user_id !== manifest.user_id) {
      fatal(`Survey ${survey.id} belongs to ${survey.user_id}, not the manifest's ${manifest.user_id}. Refusing.`);
    }
    console.log(`Survey ${survey.id}: present ("${survey.title}", status ${survey.status})`);
  }

  let found: {
    id: string;
    respondent_name: string | null;
    lead_score: number | null;
    completed: boolean;
    survey_id: string;
    user_id: string;
  }[] = [];
  if (manifest.response_ids.length > 0) {
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("id, respondent_name, lead_score, completed, survey_id, user_id")
      .in("id", manifest.response_ids);
    if (responsesError) fatal(`responses lookup failed: ${responsesError.message}`);
    found = responses ?? [];
  }
  const stray = found.filter((r) => r.survey_id !== manifest.survey_id || r.user_id !== manifest.user_id);
  if (stray.length > 0) {
    fatal(
      `${stray.length} manifest response id(s) do not belong to survey ${manifest.survey_id} / user ${manifest.user_id}. ` +
        `Refusing to delete anything: ${stray.map((r) => r.id).join(", ")}`
    );
  }

  const missing = manifest.response_ids.filter((id) => !found.some((r) => r.id === id));
  console.log(`Responses: ${found.length} present, ${missing.length} already gone`);
  for (const r of found) {
    console.log(`  ${r.id}  score ${String(r.lead_score ?? "-").padStart(2)}  ${r.respondent_name ?? "(no name)"}`);
  }

  // Anything attached to this survey that the manifest does not name. Reported
  // rather than deleted: a real interview against a seeded live survey would
  // show up here, and the manifest is the only authority on what to remove.
  const { data: unlisted } = await supabase
    .from("responses")
    .select("id, respondent_name, created_at")
    .eq("survey_id", manifest.survey_id);
  const notInManifest = (unlisted ?? []).filter((r) => !manifest.response_ids.includes(r.id));
  if (notInManifest.length > 0) {
    console.log(`\n⚠️  ${notInManifest.length} response(s) on this survey are NOT in the manifest:`);
    for (const r of notInManifest) {
      console.log(`     ${r.id}  ${r.respondent_name ?? "(no name)"}  ${r.created_at}`);
    }
    console.log("     A real delete would cascade these away with the survey. Move them first if they matter.");
  }

  if (dryRun) {
    heading("Dry run: nothing was written");
    console.log(`Would delete ${found.length} response(s), then survey ${manifest.survey_id}.`);
    console.log(`Then remove ${path.relative(process.cwd(), manifestPath)}.`);
    console.log(`\nRun for real with:\n  npx tsx scripts/seed-cleanup.ts --slug=${slug}\n`);
    return;
  }

  // --- delete: responses first, then the survey ---
  heading("Deleting");

  if (found.length > 0) {
    const { data: deletedResponses, error: deleteResponsesError } = await supabase
      .from("responses")
      .delete()
      .in("id", found.map((r) => r.id))
      .eq("survey_id", manifest.survey_id)
      .eq("user_id", manifest.user_id)
      .select("id");
    if (deleteResponsesError) fatal(`response delete failed: ${deleteResponsesError.message}`);
    console.log(`Deleted ${deletedResponses?.length ?? 0} response(s).`);
  } else {
    console.log("No responses left to delete.");
  }

  if (survey) {
    const { data: deletedSurvey, error: deleteSurveyError } = await supabase
      .from("surveys")
      .delete()
      .eq("id", manifest.survey_id)
      .eq("user_id", manifest.user_id)
      .select("id");
    if (deleteSurveyError) fatal(`survey delete failed: ${deleteSurveyError.message}`);
    console.log(`Deleted ${deletedSurvey?.length ?? 0} survey.`);
  } else {
    console.log("Survey was already gone.");
  }

  unlinkSync(manifestPath);
  console.log(`Removed ${path.relative(process.cwd(), manifestPath)}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
