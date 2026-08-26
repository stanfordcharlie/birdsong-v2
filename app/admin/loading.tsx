"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";
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
    <PageShell>
      <div className="mb-8 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-[46px] w-80" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-pill" />
          <Skeleton className="h-10 w-32 rounded-pill" />
        </div>
      </div>

      {/* One joined stat bar, matching StatRow, rather than three cards. */}
      <Skeleton className="mb-10 h-[92px] w-full rounded-card" />

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[196px] w-full rounded-card" />
        <Skeleton className="h-[196px] w-full rounded-card" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-[260px] w-full rounded-card" />
        <Skeleton className="h-[260px] w-full rounded-card" />
      </div>
    </PageShell>
  );
}
