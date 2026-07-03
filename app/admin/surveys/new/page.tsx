import { SurveyForm } from "@/components/SurveyForm";
import { Card, CardContent } from "@/components/ui/card";

export default function NewSurveyPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-card-foreground">New Survey</h1>
      <Card>
        <CardContent className="pt-6">
          <SurveyForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
