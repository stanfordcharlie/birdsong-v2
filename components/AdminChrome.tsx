"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";

// The auth screens (design_handoff_auth) are full-viewport eggshell pages that
// must NOT sit inside the admin sidebar shell. They live under /admin, so the
// admin layout would otherwise wrap them in AdminShell like every other admin
// page. This client wrapper opts those routes out of the shell entirely (the
// sidebar isn't even rendered), while every real dashboard route keeps it.
const BARE_ROUTES = ["/admin/login", "/admin/signup"];

export function AdminChrome({
  children,
  userName,
  userInitial,
}: {
  children: React.ReactNode;
  userName: string | null;
  userInitial: string;
}) {
  const pathname = usePathname();
  if (pathname && BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }
  return (
    <AdminShell userName={userName} userInitial={userInitial}>
      {children}
    </AdminShell>
  );
}
