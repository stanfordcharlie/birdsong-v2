import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="admin-container flex flex-col">
      <div className="mb-2 flex items-end justify-between gap-5 pb-5 pt-2">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-20 rounded-control" />
          <Skeleton className="h-9 w-32 rounded-control" />
        </div>
      </div>

      <Skeleton className="mb-7 h-[52px] w-full rounded-[13px]" />

      <div className="flex flex-col gap-[22px]">
        <Card className="px-[26px] py-6">
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-2 gap-[18px]">
            <Skeleton className="h-9 w-full rounded-control" />
            <Skeleton className="h-9 w-full rounded-control" />
          </div>
        </Card>
        <Card className="px-[26px] py-6">
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-16 w-full rounded-control" />
        </Card>
        <Card className="px-[26px] py-6">
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-24 w-full rounded-control" />
        </Card>
      </div>
    </div>
  );
}
