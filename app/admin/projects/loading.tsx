import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

// Mirrors the Projects page: the title beside the search field, the tabs,
// then the three-column card grid.
export default function StudiesLoading() {
  return (
    <PageShell>
      <div className="flex flex-col gap-[22px]">
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-[36px] w-[280px] rounded-control" />
        </div>
        <Skeleton className="h-[36px] w-72 rounded-control" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[340px] w-full rounded-card" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
