import { Textarea } from "birdsong-ui";

export function QuestionGuide() {
  return (
    <Textarea
      className="max-w-sm"
      rows={4}
      defaultValue={"How long has your team used your dispatch software?\nHas it had any major upgrades since?"}
    />
  );
}

export function EmptyWithPlaceholder() {
  return <Textarea className="max-w-sm" rows={3} placeholder="Type your answer..." />;
}
