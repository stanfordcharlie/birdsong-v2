import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function LeadsLoading() {
  return (
    <PageShell>
      <Skeleton className="mb-8 h-9 w-28" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-14 w-44 rounded-control" />
        <Skeleton className="h-14 w-44 rounded-control" />
      </div>
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-9 w-72 rounded-control" />
        <Skeleton className="ml-auto h-9 w-64 rounded-control" />
      </div>
      <Skeleton className="h-64 w-full rounded-card" />
    </PageShell>
  );
}
