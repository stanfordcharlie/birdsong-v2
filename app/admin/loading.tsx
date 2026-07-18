import { Skeleton } from "@/components/ui/skeleton";

export default function AdminHomeLoading() {
  return (
    <div className="-m-8 flex min-h-screen">
      <div className="flex w-[42%] min-w-[380px] flex-col justify-between bg-sidebar px-14 py-12">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-3 w-40 bg-white/10" />
          <Skeleton className="h-16 w-full bg-white/10" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-48 bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-page px-[72px] py-16">
        <Skeleton className="mb-6 h-3 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[102px] w-full rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
