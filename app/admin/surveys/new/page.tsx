import { NewSurveyWizard } from "@/components/NewSurveyWizard";

export default function NewSurveyPage() {
  return (
    <div className="admin-container flex flex-col items-center gap-7">
      <div className="flex w-full flex-col gap-2 self-start">
        <span className="type-label">Surveys</span>
        <h1 className="type-page-title">New survey</h1>
      </div>
      <NewSurveyWizard />
    </div>
  );
}
