import { Skeleton } from "@/components/ui/skeleton";
import { Card, PageShell } from "@/components/admin/ui";

export default function ProfileLoading() {
  return (
    <PageShell>
      <div className="mb-2 flex items-end justify-between gap-5 pb-5 pt-2">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-[46px] w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-48 rounded-pill" />
        </div>
      </div>

      <Skeleton className="mb-7 h-[52px] w-full rounded-card" />

      <div className="flex flex-col gap-6">
        <Card>
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-9 w-full rounded-control" />
            <Skeleton className="h-9 w-full rounded-control" />
          </div>
        </Card>
        <Card>
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-16 w-full rounded-control" />
        </Card>
        <Card>
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-24 w-full rounded-control" />
        </Card>
      </div>
    </PageShell>
  );
}
