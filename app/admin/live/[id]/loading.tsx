import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function LiveResponseLoading() {
  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    </PageShell>
  );
}
