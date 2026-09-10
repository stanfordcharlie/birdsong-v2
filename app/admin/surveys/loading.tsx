import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

// Mirrors the Projects page: title with its meta line and two actions, the
// tab row with the search field, then the two-column card grid.
export default function SurveysLoading() {
  return (
    <PageShell>
      <div className="mb-8 flex items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-pill" />
          <Skeleton className="h-10 w-28 rounded-pill" />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-64 rounded-control" />
          <Skeleton className="h-9 w-72 rounded-control" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-card" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
