import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSource } from "@/lib/interview/source";
import { InterviewFlow, type PublicSurvey } from "./InterviewFlow";

// cache() so generateMetadata and the page component share one query per
// request instead of hitting Supabase twice for the same survey.
//
// The column list is a security boundary, not an optimization: this row is
// handed (in part) to a Client Component, so every column selected here is a
// column that can reach the respondent's browser. Internal fields (topic,
// question_guide, tone, num_questions, target_*) are deliberately NOT
// selected, so they can never leak even by accident. status and user_id are
// selected for server-only gating below and are never forwarded to the client
// (see publicSurvey). Keep this list minimal; never widen it to select("*").
const getSurvey = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("surveys")
    .select(
      "id, slug, title, external_title, sponsor, public_description, gift_card_amount, custom_fields, status, user_id"
    )
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
  // public_description only, never topic: this description goes into public
  // <meta>/OpenGraph/Twitter tags and link-preview unfurls, so the internal
  // topic must never be sourced here. Falls back to a generic line, not to
  // any internal field.
  const description =
    [survey.public_description?.trim() || null, survey.sponsor ? `Research by ${survey.sponsor}` : null]
      .filter(Boolean)
      .join(" · ") || "A short research conversation. Share your perspective in your own words.";

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
  searchParams: Promise<{ test?: string; src?: string }>;
}) {
  const [{ slug }, { test, src }] = await Promise.all([params, searchParams]);
  const survey = await getSurvey(slug);

  if (!survey) {
    notFound();
  }

  // ?test=1 is only honored for the authenticated owner of this survey
  // (cookie session, checked server-side) — for anyone else the param is
  // ignored entirely and normal rules apply, so a curious respondent
  // adding it gets exactly the standard behavior.
  const isTest = test === "1" && (await getCurrentUser())?.id === survey.user_id;

  // ?src= tags which channel this link was shared through (in-app popup,
  // an email blast, paid ads, ...). Sanitized here so InterviewFlow only
  // ever sees a clean value; the start route re-sanitizes independently
  // since it's directly callable and can't trust this pass either.
  const source = sanitizeSource(src);

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

  // Explicit allowlist of the only survey fields the respondent UI needs.
  // status and user_id were selected for the server-side gates above but are
  // intentionally excluded here so they never cross into the Client
  // Component's serialized props. Anything not on this object cannot reach
  // the browser.
  const publicSurvey: PublicSurvey = {
    id: survey.id,
    title: survey.title,
    external_title: survey.external_title,
    sponsor: survey.sponsor,
    public_description: survey.public_description,
    gift_card_amount: survey.gift_card_amount,
    custom_fields: survey.custom_fields,
  };

  return (
    // survey-viewport, not min-h-screen: 100vh on iOS Safari is the
    // toolbars-hidden height, so a min-h-screen wrapper would keep the
    // document taller than the visible area and reintroduce the scroll
    // InterviewFlow's own dvh sizing exists to remove.
    <div className="font-archivo survey-viewport bg-page">
      <InterviewFlow survey={publicSurvey} logoUrl={profile?.logo_url ?? null} isTest={isTest} source={source} />
    </div>
  );
}
