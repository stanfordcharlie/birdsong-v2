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

  // Mirrors ResponseDetailView's blocks in order and rough proportion (back
  // link, identity row, the two score meters, at a glance, call script) so
  // the real page lands in place rather than reflowing under the reader.
  return (
    <div className="admin-container flex flex-col gap-4">
      <Skeleton className="h-4 w-40" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-control" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <div className="mt-1 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-52 rounded-full" />
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-7 w-48 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full rounded-card" />
          <Skeleton className="h-20 w-full rounded-card" />
        </CardContent>
      </Card>
    </div>
  );
}
