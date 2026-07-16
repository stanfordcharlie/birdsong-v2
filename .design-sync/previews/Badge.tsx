import { Badge } from "birdsong-ui";

export function LeadStatuses() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default">New</Badge>
      <Badge variant="warning">Contacted</Badge>
      <Badge variant="success">Qualified</Badge>
      <Badge variant="destructive">Not a fit</Badge>
      <Badge variant="primary">Score 8</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  );
}
