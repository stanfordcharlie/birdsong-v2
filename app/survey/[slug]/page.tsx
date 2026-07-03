import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-page px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="p-6">
            <InterviewFlow survey={survey} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
