import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireActiveOrg } from "@/lib/org";
import { generateProspectToken } from "@/lib/prospects/token";
import { parseCsv } from "@/lib/prospects/csv";
import {
  buildColumnMapping,
  isImportableEmail,
  normalizeDomain,
  type MappedField,
} from "@/lib/prospects/apollo";
import type { Json } from "@/types/database";

// POST /api/prospects/import
// multipart/form-data: { file: <Apollo CSV>, survey_id: string }
//
// Session-authed, NOT public: this creates rows holding contact details for
// people who have not agreed to anything, so it runs as the signed-in user
// against their own org's survey. The cookie client is used for the survey
// check (so org scoping is the database's job, not this route's) and for the
// insert (so the owner-only policy on prospects applies).

// A single upload is one operator action on one Apollo export. The cap is
// here so a mis-picked file cannot turn into a very long transaction; it is
// well above a normal list pull.
const MAX_ROWS = 5000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type ImportResult = {
  created: number;
  skippedDuplicate: number;
  skippedInvalid: number;
  mapping: { fields: Partial<Record<MappedField, string>>; unmapped: string[] };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let orgId: string;
  try {
    ({ orgId } = await requireActiveOrg());
  } catch (err) {
    return orgErrorResponse(err);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload" }, { status: 400 });
  }

  const surveyId = form.get("survey_id");
  const file = form.get("file");

  if (typeof surveyId !== "string" || !surveyId) {
    return NextResponse.json({ error: "survey_id is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "That file is larger than 10MB" }, { status: 400 });
  }

  // The org filter is load-bearing, not a convenience: surveys_public_read
  // makes every survey row readable, so without it an operator could import
  // a prospect list against another organization's study by id.
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id")
    .eq("id", surveyId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (surveyError) {
    console.error("[prospects/import] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "That file has a header row but no prospects in it" },
      { status: 400 }
    );
  }

  const headers = rows[0];
  const mapping = buildColumnMapping(headers);

  if (!mapping.fields.email) {
    return NextResponse.json(
      {
        error:
          "No email column found. Expected a column named Email, Email Address, Work Email or similar.",
      },
      { status: 400 }
    );
  }

  const dataRows = rows.slice(1, 1 + MAX_ROWS);
  const indexOf = (header: string | undefined) =>
    header === undefined ? -1 : headers.indexOf(header);

  const columnIndex = {
    first_name: indexOf(mapping.fields.first_name),
    last_name: indexOf(mapping.fields.last_name),
    email: indexOf(mapping.fields.email),
    title: indexOf(mapping.fields.title),
    company_name: indexOf(mapping.fields.company_name),
    company_domain: indexOf(mapping.fields.company_domain),
    linkedin_url: indexOf(mapping.fields.linkedin_url),
    apollo_id: indexOf(mapping.fields.apollo_id),
  };
  const unmappedIndexes = mapping.unmapped.map((header) => headers.indexOf(header));

  const cell = (row: string[], index: number): string | undefined =>
    index === -1 ? undefined : row[index]?.trim() || undefined;

  let skippedInvalid = 0;
  // Deduplicated within the file as well as against the table: an Apollo
  // export can list the same person twice, and a single insert carrying both
  // copies would fail the whole batch on the unique index rather than
  // skipping the repeat.
  const seenEmails = new Set<string>();
  const candidates: {
    token: string;
    survey_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    title: string | null;
    company_name: string | null;
    company_domain: string | null;
    linkedin_url: string | null;
    apollo_id: string | null;
    firmographics: Json;
    status: string;
  }[] = [];

  for (const row of dataRows) {
    const email = cell(row, columnIndex.email);
    if (!isImportableEmail(email)) {
      skippedInvalid += 1;
      continue;
    }
    const key = email!.toLowerCase();
    if (seenEmails.has(key)) continue;
    seenEmails.add(key);

    // Every column the mapping did not claim, kept under its original header
    // so it still reads like the file it came from.
    const firmographics: Record<string, string> = {};
    for (const idx of unmappedIndexes) {
      const value = row[idx]?.trim();
      if (value) firmographics[headers[idx]] = value;
    }

    candidates.push({
      token: generateProspectToken(),
      survey_id: surveyId,
      first_name: cell(row, columnIndex.first_name) ?? null,
      last_name: cell(row, columnIndex.last_name) ?? null,
      email: email!,
      title: cell(row, columnIndex.title) ?? null,
      company_name: cell(row, columnIndex.company_name) ?? null,
      company_domain: normalizeDomain(cell(row, columnIndex.company_domain)),
      linkedin_url: cell(row, columnIndex.linkedin_url) ?? null,
      apollo_id: cell(row, columnIndex.apollo_id) ?? null,
      firmographics: firmographics as Json,
      status: "pending",
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      created: 0,
      skippedDuplicate: 0,
      skippedInvalid,
      mapping,
    } satisfies ImportResult);
  }

  // Which of these we already hold. Asked before the insert so the response
  // can report duplicates as a count rather than as a failure, and asked by
  // lowercased email because that is what the unique index is built on.
  const { data: existingRows, error: existingError } = await supabase
    .from("prospects")
    .select("email")
    .eq("survey_id", surveyId);

  if (existingError) {
    console.error("[prospects/import] existing lookup failed:", existingError);
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existing = new Set((existingRows ?? []).map((r) => r.email.toLowerCase()));
  const fresh = candidates.filter((c) => !existing.has(c.email.toLowerCase()));
  const skippedDuplicate = candidates.length - fresh.length;

  // user_id is omitted from every insert on purpose: the
  // set_prospect_user_id trigger derives it from the parent survey, so it
  // cannot be asserted by this route or by anything calling it.
  //
  // No upsert/onConflict here, deliberately. The unique index is on
  // (survey_id, lower(email)) — an expression index, which PostgREST's
  // on_conflict cannot name, since that takes a column list. So the write is
  // a plain insert, and the index stays the real guard: the pre-check above
  // is what makes the counts accurate, and the retry below is what keeps a
  // row that slipped through the gap (a duplicate inside the same file that
  // differs only by case, or a concurrent import of the same list) from
  // failing the whole batch.
  const UNIQUE_VIOLATION = "23505";
  let created = 0;

  if (fresh.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("prospects")
      .insert(fresh)
      .select("id");

    if (!insertError) {
      created = inserted?.length ?? 0;
    } else if (insertError.code === UNIQUE_VIOLATION) {
      // One conflicting row aborts the whole statement, so the batch is
      // replayed a row at a time. Only the genuinely conflicting rows are
      // then lost, and they are counted as duplicates rather than reported
      // as an error the operator cannot act on.
      console.warn("[prospects/import] batch hit a duplicate; retrying row by row");
      for (const candidate of fresh) {
        const { error: rowError } = await supabase.from("prospects").insert(candidate);
        if (!rowError) {
          created += 1;
        } else if (rowError.code !== UNIQUE_VIOLATION) {
          console.error("[prospects/import] row insert failed:", rowError);
          return NextResponse.json({ error: rowError.message }, { status: 500 });
        }
      }
    } else {
      console.error("[prospects/import] insert failed:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  console.log(
    `[prospects/import] survey_id=${surveyId} created=${created} duplicate=${skippedDuplicate} invalid=${skippedInvalid}`
  );

  return NextResponse.json({
    created,
    // A row the pre-check cleared but the index rejected is still a
    // duplicate, not a silent loss, so the count is derived from what was
    // actually written.
    skippedDuplicate: skippedDuplicate + (fresh.length - created),
    skippedInvalid,
    mapping,
  } satisfies ImportResult);
}
