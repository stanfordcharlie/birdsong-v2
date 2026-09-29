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

  // Mirrors the page: greeting, launcher, the worth-a-call card beside
  // Needs you, then Live now.
  return (
    <PageShell>
      <div className="px-4 pt-3">
        <div className="flex max-w-[1080px] flex-col gap-7">
          <div className="flex flex-col gap-[18px]">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-[56px] w-full rounded-card" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Skeleton className="h-[192px] w-full rounded-card" />
            <Skeleton className="h-[192px] w-full rounded-card" />
          </div>
          <Skeleton className="h-[108px] w-full rounded-card" />
        </div>
      </div>
    </PageShell>
  );
}
