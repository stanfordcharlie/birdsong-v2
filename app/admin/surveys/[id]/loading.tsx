import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function SurveyDetailLoading() {
  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <div className="flex items-center justify-between gap-6">
          <Skeleton className="h-9 w-72" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24 rounded-pill" />
            <Skeleton className="h-10 w-36 rounded-pill" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-36 w-full rounded-card" />
        </div>
      </div>
    </PageShell>
  );
}
