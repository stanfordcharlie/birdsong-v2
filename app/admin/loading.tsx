import { Skeleton } from "@/components/ui/skeleton";

export default function AdminHomeLoading() {
  return (
    <div className="admin-container flex flex-col">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-10 w-80" />
      </div>

      <div className="mt-12 flex flex-col gap-4">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-5 w-full max-w-[520px]" />
        <Skeleton className="h-5 w-full max-w-[440px]" />
      </div>

      <div className="mt-12 flex flex-col gap-4">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
