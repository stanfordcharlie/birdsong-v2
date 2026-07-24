import { NewSurveyWizard } from "@/components/NewSurveyWizard";

// No wrapper here: most steps render their own "Surveys" / "New survey"
// header inside NewSurveyWizard's boxed layout, but the redesigned
// External name step (design_handoff_create_survey) takes over the full
// content area itself (two-pane, no outer page title) — see the
// STEP_EXTERNAL_NAME branch in NewSurveyWizard for why that header can't
// live at this level anymore.
export default function NewSurveyPage() {
  return <NewSurveyWizard />;
}
