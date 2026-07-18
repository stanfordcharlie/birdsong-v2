import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function SurveyDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-9 w-16 rounded-control" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      <Skeleton className="h-11 w-full rounded-control" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <Skeleton className="h-16 w-full" />
          </Card>
        </div>
        <Card className="flex flex-col gap-4 p-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
