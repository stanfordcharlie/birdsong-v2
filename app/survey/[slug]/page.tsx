import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InterviewFlow } from "./InterviewFlow";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: survey } = await supabase
    .from("surveys")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!survey) {
    notFound();
  }

  // A draft survey isn't publicly answerable yet. A 404 (not a distinct
  // "this survey is closed" page) is deliberate: it's the least-informative
  // response and doesn't confirm a draft slug exists.
  if (survey.status !== "live") {
    notFound();
  }

  // The respondent has no session, and profiles RLS only allows a row's own
  // owner to read it, so the survey owner's logo needs the admin client to
  // fetch across that boundary. Only the logo URL is exposed to the page.
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("logo_url")
    .eq("user_id", survey.user_id)
    .maybeSingle();

  return (
    <div className="font-archivo min-h-screen bg-page">
      <InterviewFlow survey={survey} logoUrl={profile?.logo_url ?? null} />
    </div>
  );
}
