import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from "birdsong-ui";

export function SurveySummary() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Dispatch software renewal interview</CardTitle>
          <Badge variant="success">Qualified</Badge>
        </div>
        <CardDescription>18 responses, 6 questions each</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-card-foreground">
          Commercial HVAC and plumbing teams describe how they currently handle scheduling and dispatch.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" size="sm">
          View responses
        </Button>
      </CardFooter>
    </Card>
  );
}
