import { SurveyForm } from "@/components/SurveyForm";

export default function NewSurveyPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New Survey</h1>
      <SurveyForm mode="create" />
    </div>
  );
}
