"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";
import { isBareAdminRoute } from "@/lib/admin-routes";

// The auth screens (design_handoff_auth) are full-viewport eggshell pages that
// must NOT sit inside the admin sidebar shell. They live under /admin, so the
// admin layout would otherwise wrap them in AdminShell like every other admin
// page. This client wrapper opts those routes out of the shell entirely (the
// sidebar isn't even rendered), while every real dashboard route keeps it.
//
// Which routes are bare is decided once, in lib/admin-routes.ts, and shared
// with middleware.ts: any route a logged-out visitor can reach has to be
// bare, or they are shown the signed-in app's chrome around a form they
// reached without an account. /invite lives outside app/admin, so this
// layout never wraps it and it needs no entry.

export function AdminChrome({
  children,
  userName,
  userRole,
  logoUrl,
  sidebarCollapsed,
}: {
  children: React.ReactNode;
  userName: string | null;
  userRole: string | null;
  logoUrl: string | null;
  sidebarCollapsed: boolean;
}) {
  const pathname = usePathname();
  if (pathname && isBareAdminRoute(pathname)) {
    return <>{children}</>;
  }
  return (
    <AdminShell userName={userName} userRole={userRole} logoUrl={logoUrl} sidebarCollapsed={sidebarCollapsed}>
      {children}
    </AdminShell>
  );
}
