// The admin routes a signed-out visitor may reach, in one place.
//
// Imported by middleware.ts (which decides who is redirected to sign in)
// and by components/AdminChrome.tsx (which decides who gets the signed-in
// shell around the page). The two lists used to be maintained by hand in
// both files and drifted: the password routes were exempted from auth but
// not from the chrome, so a signed-out visitor saw a sidebar with an
// account plate around the reset-password form. Pure constants and
// functions only: this file must stay importable from the client bundle
// and from middleware, so nothing server-only lives here.

export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/login";
export const ADMIN_SIGNUP = "/admin/signup";

export const BARE_ADMIN_ROUTES = [
  ADMIN_LOGIN,
  ADMIN_SIGNUP,
  "/admin/forgot-password",
  "/admin/reset-password",
] as const;

/** Exact match or a child path ("/admin/login/x"), never a loose prefix ("/admin/login-x"). */
export function isBareAdminRoute(pathname: string): boolean {
  return BARE_ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Where to send someone after they sign in or sign up. The `next` query
 * parameter is user-controlled, so it is only honoured when it is a path
 * inside the admin app: exactly "/admin", or "/admin/" followed by anything
 * that is not another slash (which would make it protocol-relative). A
 * scheme, a host, a backslash or a bare-route target all fall back to
 * ADMIN_HOME. This is what keeps the parameter from being an open redirect.
 */
export function safeAdminNext(next: string | null | undefined): string {
  if (typeof next !== "string") return ADMIN_HOME;
  const value = next.trim();
  if (value === ADMIN_HOME) return ADMIN_HOME;
  if (!value.startsWith("/admin/")) return ADMIN_HOME;
  // No "//" anywhere: at the start it is protocol-relative, and later it is
  // not a path this app has, so there is nothing to lose by refusing it.
  if (value.includes("//") || value.includes("\\") || /[\r\n\s]/.test(value)) return ADMIN_HOME;
  const pathname = value.split(/[?#]/, 1)[0];
  if (isBareAdminRoute(pathname)) return ADMIN_HOME;
  return value;
}
