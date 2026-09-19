import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrg } from "@/lib/org";
import { prospectLinkFor, resolveAppOriginFromHost } from "@/lib/prospects/link";
import { ProspectsView, type ProspectRow } from "./ProspectsView";

// The prospects roster for one study.
//
// A sibling route rather than a tab, because the survey detail page has no
// tab pattern to join: it is one column of sections. Wired from a link in
// that page's header.

export default async function StudyProspectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { orgId } = await requireActiveOrg();

  // The org filter is the access check. surveys_public_read makes every
  // survey row readable, so without it this page would render another
  // organization's study rather than 404ing.
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, slug, title, external_title")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!survey) {
    notFound();
  }

  // Explicit columns. firmographics and apollo_id are deliberately not read:
  // nothing on this screen renders them, and a page that does not fetch them
  // cannot leak them into a client bundle.
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, token, first_name, last_name, email, title, company_name, status, created_at")
    .eq("survey_id", id)
    .order("created_at", { ascending: false });

  // Built on the server so the roster and the exported CSV cannot disagree
  // about what a prospect's link is. NEXT_PUBLIC_APP_URL is canonical when
  // set; the request host is the local-development fallback.
  const origin = resolveAppOriginFromHost((await headers()).get("host"));

  const rows: ProspectRow[] = (prospects ?? []).map((p) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null,
    title: p.title,
    company: p.company_name,
    email: p.email,
    status: p.status,
    createdAt: p.created_at,
    link: prospectLinkFor(origin, survey.slug, p.token),
  }));

  return (
    <ProspectsView
      surveyId={survey.id}
      surveyTitle={survey.external_title || survey.title}
      rows={rows}
    />
  );
}
