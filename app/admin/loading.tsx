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

  return (
    <PageShell>
      <div className="mb-8 flex items-center justify-between gap-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-28 rounded-pill" />
      </div>

      <div className="flex flex-col gap-10">
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
        </div>
        <Skeleton className="h-36 w-full rounded-card" />
      </div>
    </PageShell>
  );
}
