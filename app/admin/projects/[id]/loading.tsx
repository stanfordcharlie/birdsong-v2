import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

// Mirrors the study page: title row, stat row, tabs, then the responses
// table beside the quality card.
export default function StudyDetailLoading() {
  return (
    <PageShell className="gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-[26px] w-16 rounded-control" />
      </div>
      <Skeleton className="h-[76px] w-full rounded-card" />
      <Skeleton className="h-[42px] w-full rounded-control" />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton className="h-[402px] w-full rounded-card" />
        <Skeleton className="h-[140px] w-full rounded-card" />
      </div>
    </PageShell>
  );
}
