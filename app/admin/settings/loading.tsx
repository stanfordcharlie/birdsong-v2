import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";

// Mirrors the Settings page: title with subtitle and one action, then
// two-column rows with a card on the right.
export default function SettingsLoading() {
  return (
    <PageShell>
      <div className="mb-8 flex items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-24 rounded-pill" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="grid gap-5 border-t border-border py-8 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-28 w-full rounded-card" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
