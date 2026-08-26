import { Skeleton } from "@/components/ui/skeleton";

export default function LiveResponseLoading() {
  return (
    <div className="admin-container flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-[380px] w-full rounded-card" />
      </div>
    </div>
  );
}
