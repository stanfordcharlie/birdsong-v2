import { Skeleton } from "birdsong-ui";

export function TableRowLoading() {
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
