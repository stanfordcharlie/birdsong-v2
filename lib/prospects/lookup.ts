import { createAdminClient } from "@/lib/supabase/admin";
import { looksLikeProspectToken } from "./token";

// What a resolved token is allowed to tell the browser. An explicit
// allowlist, not the row: prospects holds enrichment we bought (apollo_id,
// firmographics, company_domain) and internal lifecycle state, none of which
// the recipient's page has any reason to receive. Widening this object is
// how that data would reach a client bundle, so keep it at what the landing
// page actually renders plus what the start call needs to prefill.
export type ResolvedProspect = {
  id: string;
  // Handed back to the client so the start call can return it for
  // re-resolution. Not new exposure: it is the value already in the
  // recipient's address bar, and the start route trusts the round trip no
  // further than it trusts the URL.
  token: string;
  firstName: string | null;
  fullName: string | null;
  email: string;
  companyName: string | null;
  title: string | null;
  // Whether this invite has already been opened-and-started. Drives the
  // landing page's returning-visitor copy; it is not a gate (see the route).
  alreadyStarted: boolean;
};

// Resolves a prospect link. Service-role, because prospects has no anon
// policy at all and the person clicking has no session — holding the token
// IS the credential, and this function is the only place that is honored.
//
// Scoped to the slug as well as the token: a token is meaningless against a
// survey it was not issued for, and without the join a leaked token would
// work on every study in the system.
//
// Returns null for every failure — unknown token, wrong survey, malformed
// segment. The caller falls through to the anonymous flow rather than
// 404ing: these links are pasted into cold email, where they get mangled by
// tracking rewriters, truncated by clients, and retyped by hand. A recipient
// whose token did not survive the trip must still land on a working survey.
export async function resolveProspectToken(
  token: string,
  slug: string
): Promise<ResolvedProspect | null> {
  // Rejected before the query: a path segment that cannot be a token is a
  // crawler or a mangled link, not a lookup.
  if (!looksLikeProspectToken(token)) return null;

  const supabase = createAdminClient();

  // Never select("*") on an admin-client read (see lib/supabase/admin.ts).
  // The join to surveys is what enforces the slug scoping in one round trip;
  // !inner so a prospect whose survey was deleted resolves to nothing.
  const { data, error } = await supabase
    .from("prospects")
    .select("id, first_name, last_name, email, title, company_name, started_at, surveys!inner(slug)")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    // A lookup failure is not a reason to deny someone their survey. Log it
    // and let the caller fall through to the anonymous flow.
    console.error("[prospects/lookup] token lookup failed:", error);
    return null;
  }
  if (!data) return null;

  // The joined row is typed as an array by the generated types even though
  // !inner on a to-one relationship yields exactly one.
  const survey = Array.isArray(data.surveys) ? data.surveys[0] : data.surveys;
  if (!survey || survey.slug !== slug) return null;

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;

  return {
    id: data.id,
    token,
    firstName: data.first_name?.trim() || null,
    fullName,
    email: data.email,
    companyName: data.company_name?.trim() || null,
    title: data.title?.trim() || null,
    alreadyStarted: data.started_at != null,
  };
}

// The server-side half of a prospect start: re-resolves the token (the
// client is never trusted to name which prospect it is) and hands back the
// fields the start route writes onto the responses row.
//
// Separate from resolveProspectToken because the two have different
// appetites: the page's version is display-shaped and forgiving, this one is
// write-shaped and returns the raw record the route needs.
export type ProspectForStart = {
  id: string;
  surveyId: string | null;
  name: string | null;
  email: string;
  title: string | null;
  companyName: string | null;
  companyDomain: string | null;
  startedAt: string | null;
};

export async function resolveProspectForStart(
  token: unknown,
  surveyId: string
): Promise<ProspectForStart | null> {
  if (!looksLikeProspectToken(token)) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prospects")
    .select("id, survey_id, first_name, last_name, email, title, company_name, company_domain, started_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("[prospects/lookup] start-token lookup failed:", error);
    return null;
  }
  if (!data) return null;
  // A token issued for a different study cannot start this one. Checked
  // against the survey_id the caller is actually starting, not against
  // anything else the caller said.
  if (data.survey_id !== surveyId) return null;

  return {
    id: data.id,
    surveyId: data.survey_id,
    name: [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null,
    email: data.email,
    title: data.title?.trim() || null,
    companyName: data.company_name?.trim() || null,
    companyDomain: data.company_domain?.trim() || null,
    startedAt: data.started_at,
  };
}

// Marks the invite as started. Idempotent on started_at (`is null` in the
// filter) so a prospect who returns keeps their original start time, while
// status still advances. Failure here is logged and swallowed by the caller:
// the interview the respondent is actually in must not fail because its
// invite bookkeeping did.
export async function markProspectStarted(prospectId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error: stampError } = await supabase
    .from("prospects")
    .update({ started_at: new Date().toISOString() })
    .eq("id", prospectId)
    .is("started_at", null);
  if (stampError) console.error("[prospects/lookup] started_at stamp failed:", stampError);

  const { error: statusError } = await supabase
    .from("prospects")
    .update({ status: "started" })
    .eq("id", prospectId);
  if (statusError) console.error("[prospects/lookup] status update failed:", statusError);
}
