"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";

// The auth screens (design_handoff_auth) are full-viewport eggshell pages that
// must NOT sit inside the admin sidebar shell. They live under /admin, so the
// admin layout would otherwise wrap them in AdminShell like every other admin
// page. This client wrapper opts those routes out of the shell entirely (the
// sidebar isn't even rendered), while every real dashboard route keeps it.
//
// Must stay in step with PUBLIC_ADMIN_ROUTES in middleware.ts: any route a
// logged-out visitor can reach has to be bare, or they are shown the signed-in
// app's chrome — a sidebar with their account plate and five nav links — around
// a form they reached without an account. forgot-password and reset-password
// were exempted from auth there but never added here, so both rendered inside
// the shell for exactly the visitors who should not see it.
//
// /invite lives outside app/admin, so this layout never wraps it, but it is
// listed here anyway so the two lists read the same. Matched as a prefix,
// because the accept page carries a token segment.
const BARE_ROUTES = [
  "/admin/login",
  "/admin/signup",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/invite",
];

function isBareRoute(pathname: string): boolean {
  return BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function AdminChrome({
  children,
  userName,
  userRole,
  sidebarCollapsed,
}: {
  children: React.ReactNode;
  userName: string | null;
  userRole: string | null;
  sidebarCollapsed: boolean;
}) {
  const pathname = usePathname();
  if (pathname && isBareRoute(pathname)) {
    return <>{children}</>;
  }
  return (
    <AdminShell userName={userName} userRole={userRole} sidebarCollapsed={sidebarCollapsed}>
      {children}
    </AdminShell>
  );
}
