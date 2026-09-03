"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useFlybyGate } from "@/components/useLoadingGate";

export default function ResponseDetailLoading() {
  // Mounted for exactly as long as this route is loading, so the wait
  // "starts" the moment this renders. The gate gives it the same nothing for
  // a beat, then cutscene (at most once per session) treatment as the other
  // known-long waits. Falls back to the skeleton below otherwise.
  const showFlyby = useFlybyGate(true, "responses-view");

  if (showFlyby) {
    return <LoadingScreen statusText="Loading the transcript" />;
  }

  // Mirrors ResponseDetailView's blocks in order and rough proportion so the
  // real page lands in place rather than reflowing under the reader.
  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <div className="flex items-center justify-between gap-6">
          <Skeleton className="h-9 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-control" />
            <Skeleton className="h-10 w-36 rounded-pill" />
          </div>
        </div>
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="flex flex-col gap-8">
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
    </PageShell>
  );
}
