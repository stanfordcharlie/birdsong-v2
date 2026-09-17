import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function LiveLoading() {
  return (
    <PageShell>
      <Skeleton className="mb-8 h-9 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    </PageShell>
  );
}
