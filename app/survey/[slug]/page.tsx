import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InterviewFlow } from "./InterviewFlow";

// cache() so generateMetadata and the page component share one query per
// request instead of hitting Supabase twice for the same survey.
const getSurvey = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("surveys")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

// Survey URLs are distributed links (ads, Slack, SMS), so their previews
// carry the respondent-facing name and sponsor rather than the app-generic
// fallback. external_title over title always: title is the internal admin
// name (e.g. "7/14/26 P&R") and must never surface in a link preview.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const survey = await getSurvey(slug);

  // Missing and draft surveys both render a 404, and their previews stay
  // generic for the same least-information reason.
  if (!survey || survey.status !== "live") {
    return {};
  }

  const name = survey.external_title || survey.title;
  const description =
    [survey.topic?.trim() || null, survey.sponsor ? `Research by ${survey.sponsor}` : null]
      .filter(Boolean)
      .join(" · ") || "A short research conversation — share your perspective in your own words.";

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      type: "website",
      siteName: "Birdsong",
    },
    twitter: {
      card: "summary",
      title: name,
      description,
    },
  };
}

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ test?: string }>;
}) {
  const [{ slug }, { test }] = await Promise.all([params, searchParams]);
  const survey = await getSurvey(slug);

  if (!survey) {
    notFound();
  }

  // ?test=1 is only honored for the authenticated owner of this survey
  // (cookie session, checked server-side) — for anyone else the param is
  // ignored entirely and normal rules apply, so a curious respondent
  // adding it gets exactly the standard behavior.
  const isTest = test === "1" && (await getCurrentUser())?.id === survey.user_id;

  // A draft survey isn't publicly answerable yet. A 404 (not a distinct
  // "this survey is closed" page) is deliberate: it's the least-informative
  // response and doesn't confirm a draft slug exists. The owner's test
  // path is the one exception — previewing before going live is its point.
  if (survey.status !== "live" && !isTest) {
    notFound();
  }

  // The respondent has no session, and profiles RLS only allows a row's own
  // owner to read it, so the survey owner's logo needs the admin client to
  // fetch across that boundary. Only the logo URL is exposed to the page —
  // and any select here must stay this narrow: every admin-client read that
  // crosses an RLS boundary is one careless select("*") away from leaking a
  // sponsor's whole profile to the public.
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("logo_url")
    .eq("user_id", survey.user_id)
    .maybeSingle();

  return (
    <div className="font-archivo min-h-screen bg-page">
      <InterviewFlow survey={survey} logoUrl={profile?.logo_url ?? null} isTest={isTest} />
    </div>
  );
}
