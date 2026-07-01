import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResponsesTable } from "./ResponsesTable";
import { SurveyUrl } from "./SurveyUrl";
import { SurveyForm, type SurveyFormValues } from "@/components/SurveyForm";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: survey } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!survey) {
    notFound();
  }

  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("survey_id", id)
    .order("created_at", { ascending: false });

  const initialValues: SurveyFormValues = {
    title: survey.title,
    slug: survey.slug,
    topic: survey.topic ?? "",
    sponsor: survey.sponsor ?? "",
    questionGuide: survey.question_guide ?? "",
    tone: survey.tone ?? "",
    numQuestions: survey.num_questions != null ? String(survey.num_questions) : "",
    giftCardAmount: survey.gift_card_amount != null ? String(survey.gift_card_amount) : "",
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{survey.title}</h1>
        <p className="text-sm text-neutral-500">{responses?.length ?? 0} responses</p>
        <SurveyUrl slug={survey.slug} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase text-neutral-500">Survey details</h2>
        <SurveyForm mode="edit" surveyId={survey.id} initialValues={initialValues} />
      </div>

      <ResponsesTable responses={responses ?? []} />
    </div>
  );
}
