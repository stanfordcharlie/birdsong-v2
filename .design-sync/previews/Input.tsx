import { Input } from "birdsong-ui";

export function TextAndEmail() {
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <Input type="text" placeholder="Internal name" defaultValue="Q3 renewal check-in" />
      <Input type="email" placeholder="Your email" />
    </div>
  );
}

export function DisabledState() {
  return <Input type="text" defaultValue="Locked field" disabled className="max-w-sm" />;
}
