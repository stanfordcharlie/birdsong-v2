import { Skeleton } from "@/components/ui/skeleton";

// The home page itself has no data fetching (only the shared layout above
// it does, for the signed-in user), so this mostly guards a future data
// dependency here rather than the layout's own fetch, which this segment's
// boundary sits below and can't cover.
export default function AdminHomeLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="flex w-full max-w-lg flex-col items-center gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid w-full max-w-lg grid-cols-1 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
