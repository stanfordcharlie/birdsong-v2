import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="min-h-screen bg-page">
      <InterviewFlow survey={survey} />
    </div>
  );
}
