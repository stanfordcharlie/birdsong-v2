import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function ProfileLoading() {
  return (
    <PageShell className="[&_.animate-pulse]:animate-none">
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <div className="flex items-center justify-between gap-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-10 w-28 rounded-pill" />
        </div>
      </div>

      <Skeleton className="mb-6 h-9 w-full rounded-control" />

      <div className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 border-t border-border py-5 first:border-t-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
