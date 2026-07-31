"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useFlybyGate } from "@/components/useLoadingGate";

export default function AdminHomeLoading() {
  // /admin is exactly where a fresh login lands (LoginForm does a full
  // navigation to "/admin"), so this route's loading state doubles as "first
  // app-shell load after login" in the common case. The once-per-session
  // gate means later same-session visits to /admin (e.g. clicking Home in
  // the sidebar) fall back to the plain skeleton instead of replaying the
  // cutscene.
  const showFlyby = useFlybyGate(true, "app-shell-first-load");

  if (showFlyby) {
    return <LoadingScreen statusText="Getting your workspace ready" />;
  }

  return (
    <div className="admin-container flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-10 w-80" />
        </div>
        <Skeleton className="h-16 w-[120px] shrink-0 rounded-card" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[98px] w-full rounded-card" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[330px] w-full rounded-card" />
        <Skeleton className="h-[330px] w-full rounded-card" />
      </div>
    </div>
  );
}
