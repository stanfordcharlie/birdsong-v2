import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { orgErrorResponse, requireActiveOrg } from "@/lib/org";
import { toCsv } from "@/lib/prospects/csv";
import { prospectLinkFor, resolveAppOrigin } from "@/lib/prospects/link";

// GET /api/prospects/export?survey_id=<uuid>
//
// The Instantly upload file: one row per prospect, identity columns plus
// birdsong_link, which is the whole point. Instantly merges that column into
// the send as a variable, so each recipient gets their own tokenized URL.
//
// Session-authed. survey_id in the query string is an opaque id the operator
// already has in their address bar, not personal data — the PII is in the
// file this returns, which is why it is a download and not a page.
export async function GET(request: Request) {
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

  const surveyId = new URL(request.url).searchParams.get("survey_id");
  if (!surveyId) {
    return NextResponse.json({ error: "survey_id is required" }, { status: 400 });
  }

  // Same org filter as the import route, and for the same reason:
  // surveys_public_read would otherwise let any signed-in user export
  // another organization's prospect list by id.
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, slug, title")
    .eq("id", surveyId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (surveyError) {
    console.error("[prospects/export] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  // Explicit column list, never select("*"): this file leaves the building,
  // and a new column added to the table later should not silently start
  // appearing in an export that goes to a third-party sending tool.
  const { data: prospects, error: prospectsError } = await supabase
    .from("prospects")
    .select(
      "token, first_name, last_name, email, title, company_name, company_domain, linkedin_url, status, created_at"
    )
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: true });

  if (prospectsError) {
    console.error("[prospects/export] prospects lookup failed:", prospectsError);
    return NextResponse.json({ error: prospectsError.message }, { status: 500 });
  }

  const origin = resolveAppOrigin(request);

  const header = [
    "first_name",
    "last_name",
    "email",
    "title",
    "company_name",
    "company_domain",
    "linkedin_url",
    "status",
    "birdsong_link",
  ];

  const body = (prospects ?? []).map((p) => [
    p.first_name,
    p.last_name,
    p.email,
    p.title,
    p.company_name,
    p.company_domain,
    p.linkedin_url,
    p.status,
    prospectLinkFor(origin, survey.slug, p.token),
  ]);

  // Trailing CRLF: some uploaders drop the final record without it.
  const csv = toCsv([header, ...body]) + "\r\n";

  // Slugified study name so an operator with three exports open can tell
  // them apart in the Downloads folder.
  const filename = `birdsong-prospects-${survey.slug}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // This file is a list of named people. It must not sit in a shared
      // cache, and it must not be re-served from the browser's own.
      "Cache-Control": "no-store, private",
    },
  });
}
