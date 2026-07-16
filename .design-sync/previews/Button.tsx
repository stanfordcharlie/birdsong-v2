import { Button } from "birdsong-ui";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Create survey</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="link">Learn more</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

export function DisabledState() {
  return (
    <Button variant="primary" disabled>
      Saving...
    </Button>
  );
}
