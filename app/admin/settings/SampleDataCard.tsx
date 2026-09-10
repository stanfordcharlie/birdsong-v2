import { AddSampleDataButton, RemoveSampleDataButton } from "@/components/SampleDataControls";
import { adminButtonVariants } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

// The card body for the Sample data row: one state when the demo study is
// in the workspace, one when it is not, and only the relevant action shown.
export function SampleDataCard({
  sample,
}: {
  sample: { title: string; responseCount: number } | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="type-body font-medium">
          {sample ? "Demo study is in your workspace" : "No demo study in your workspace"}
        </p>
        <p className="type-body-sm text-muted-foreground">
          {sample
            ? `“${sample.title}” · ${sample.responseCount} test ${sample.responseCount === 1 ? "response" : "responses"}`
            : "Add one to see the dashboard with data in it."}
        </p>
      </div>
      {sample ? (
        <RemoveSampleDataButton
          className={cn(adminButtonVariants({ variant: "secondary" }), "text-destructive")}
        />
      ) : (
        <AddSampleDataButton className={cn(adminButtonVariants({ variant: "secondary" }))} />
      )}
    </div>
  );
}
