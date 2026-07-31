"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useFlybyGate } from "@/components/useLoadingGate";

export default function ResponseDetailLoading() {
  // Mounted for exactly as long as this route is loading, so the wait
  // "starts" the moment this renders — the gate gives it the same nothing
  // for ~300ms, then cutscene (at most once per session) treatment as the
  // other known-long waits. Falls back to the skeleton below both before
  // 300ms and on a repeat visit this session.
  const showFlyby = useFlybyGate(true, "responses-view");

  if (showFlyby) {
    return <LoadingScreen statusText="Loading the transcript" />;
  }

  return (
    <div className="admin-container flex flex-col gap-6">
      <Skeleton className="h-4 w-32" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <Skeleton className="h-14 w-full" />

      <Card className="border-2 border-border">
        <CardContent className="flex flex-col gap-4 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>

      <Skeleton className="h-12 w-full" />
    </div>
  );
}
