"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useFlybyGate } from "@/components/useLoadingGate";

export default function AdminHomeLoading() {
  // /admin is exactly where a fresh login lands (LoginForm does a full
  // navigation to "/admin"), so this route's loading state doubles as "first
  // app-shell load after login" in the common case. The once-per-session
  // gate means later same-session visits to /admin fall back to the plain
  // skeleton instead of replaying the cutscene.
  const showFlyby = useFlybyGate(true, "app-shell-first-load");

  if (showFlyby) {
    return <LoadingScreen statusText="Getting your workspace ready" />;
  }

  // Mirrors the page: header, composer, the study card beside the side
  // column, the checklist.
  return (
    <PageShell>
      <div className="mb-8 flex items-center justify-between gap-6">
        <Skeleton className="h-9 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-9 w-56 rounded-control sm:block" />
          <Skeleton className="h-10 w-28 rounded-pill" />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <Skeleton className="h-20 w-full rounded-card" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-card lg:col-span-2" />
          <div className="flex flex-col gap-8">
            <Skeleton className="h-40 w-full rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
          </div>
        </div>
        <Skeleton className="h-14 w-full rounded-card" />
      </div>
    </PageShell>
  );
}
