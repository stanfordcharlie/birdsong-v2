"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";
import type { SidebarData } from "./AdminSidebar";
import { isBareAdminRoute } from "@/lib/admin-routes";

// The auth screens (design_handoff_auth) are full-viewport pages that must
// NOT sit inside the admin shell. They live under /admin, so the admin layout
// would otherwise wrap them in AdminShell like every other admin page. This
// client wrapper opts those routes out of the shell entirely (neither the
// sidebar nor the top bar is rendered, and the Ledger II token scope is not
// applied), while every real dashboard route keeps it.
//
// Which routes are bare is decided once, in lib/admin-routes.ts, and shared
// with middleware.ts: any route a logged-out visitor can reach has to be
// bare, or they are shown the signed-in app's chrome around a form they
// reached without an account. /invite lives outside app/admin, so this
// layout never wraps it and it needs no entry.

export function AdminChrome({
  children,
  userName,
  workspaceName,
  sidebar,
}: {
  children: React.ReactNode;
  userName: string | null;
  workspaceName: string | null;
  sidebar: SidebarData;
}) {
  const pathname = usePathname();
  if (pathname && isBareAdminRoute(pathname)) {
    return <>{children}</>;
  }
  return (
    <AdminShell userName={userName} workspaceName={workspaceName} sidebar={sidebar}>
      {children}
    </AdminShell>
  );
}
