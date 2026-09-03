import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function SurveysLoading() {
  return (
    <PageShell>
      <div className="mb-8 flex items-center justify-between gap-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-28 rounded-pill" />
      </div>
      <div className="flex flex-col gap-8">
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-9 w-64 rounded-control" />
            <Skeleton className="h-9 w-56 rounded-control" />
          </div>
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      </div>
    </PageShell>
  );
}
