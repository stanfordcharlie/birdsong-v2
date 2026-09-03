import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

export default function SettingsLoading() {
  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="admin-measure flex flex-col">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 border-t border-border py-5 first:border-t-0 first:pt-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full max-w-sm rounded-control" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
