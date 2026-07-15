import { NewSurveyWizard } from "@/components/NewSurveyWizard";

export default function NewSurveyPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="self-start text-xl font-semibold text-card-foreground">New Survey</h1>
      <NewSurveyWizard />
    </div>
  );
}
