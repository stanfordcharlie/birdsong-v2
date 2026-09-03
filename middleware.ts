import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes that must stay reachable by a logged-out visitor: log in, sign
  // up, the password-recovery flow (request + set-new-password, which is
  // landed on via a still-unauthenticated click from an email link), and
  // the team-invite accept page, which most people reach with no account.
  //
  // Must stay in step with BARE_ROUTES in components/AdminChrome.tsx.
  const PUBLIC_ADMIN_ROUTES = [
    "/admin/login",
    "/admin/signup",
    "/admin/forgot-password",
    "/admin/reset-password",
    "/invite",
  ];

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isPublicAdminRoute = PUBLIC_ADMIN_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // /invite is matched so the session cookie is refreshed on the way in,
  // but it is public: an invitee typically has no session yet.
  if (isAdminRoute && !isPublicAdminRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/invite/:path*"],
};
