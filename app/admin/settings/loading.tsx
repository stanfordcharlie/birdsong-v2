import { Skeleton } from "@/components/ui/skeleton";

// Mirrors a Settings section: the title with its one line, then rows with a
// card on the right. Drawn inside the layout, so the sub-nav is already there.
export default function SettingsLoading() {
  return (
    <div className="flex max-w-[900px] flex-col gap-[18px]">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid gap-4 border-t border-border py-6 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-24 w-full rounded-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
