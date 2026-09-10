import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { orgErrorResponse, requireActiveOrg } from "@/lib/org";
import type { SearchResults } from "@/components/admin/GlobalSearch";

// The admin's global search. Two ilike lookups, run here rather than in the
// browser so the query shape lives in one reviewable place.
//
// surveys has a public-read policy (see 20260903000005_org_rls.sql), so RLS
// alone does not narrow it to this org; the explicit org_id filter is what
// scopes it. responses is scoped by "org members read responses", and the
// org_id filter there is belt and braces.

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 2;
const PER_GROUP = 5;

/**
 * Turns user input into a quoted PostgREST ilike pattern. Backslash and the
 * double quote would break the filter grammar, so they are dropped; the LIKE
 * wildcards are escaped so "50%" matches a literal percent sign.
 */
function likePattern(q: string): string {
  const cleaned = q.replace(/["\\]/g, "").replace(/[%_]/g, (c) => `\\${c}`);
  return `"%${cleaned}%"`;
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  const empty: SearchResults = { studies: [], respondents: [] };
  if (q.length < MIN_QUERY_LENGTH) return NextResponse.json(empty);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let orgId: string;
  try {
    ({ orgId } = await requireActiveOrg());
  } catch (err) {
    return orgErrorResponse(err);
  }

  const supabase = await createClient();
  const pattern = likePattern(q);

  const [{ data: studies, error: studiesError }, { data: respondents, error: respondentsError }] =
    await Promise.all([
      supabase
        .from("surveys")
        .select("id, title, topic, slug, created_at")
        .eq("org_id", orgId)
        .or(`title.ilike.${pattern},topic.ilike.${pattern},slug.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(PER_GROUP),
      supabase
        .from("responses")
        .select("id, respondent_name, respondent_email, lead_score, created_at, surveys(title)")
        .eq("org_id", orgId)
        .eq("is_test", false)
        .or(`respondent_name.ilike.${pattern},respondent_email.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(PER_GROUP),
    ]);

  if (studiesError || respondentsError) {
    console.error("[api/search] query failed", studiesError ?? respondentsError);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const results: SearchResults = {
    studies: (studies ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      topic: s.topic,
    })),
    respondents: (respondents ?? []).map((r) => ({
      id: r.id,
      name: r.respondent_name?.trim() || "Anonymous",
      email: r.respondent_email,
      studyTitle: r.surveys?.title ?? null,
      leadScore: r.lead_score,
    })),
  };
  return NextResponse.json(results);
}
