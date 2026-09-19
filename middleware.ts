import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HOME, ADMIN_LOGIN, ADMIN_SIGNUP, isBareAdminRoute } from "@/lib/admin-routes";

// Invite tokens are base64url; anything else is dropped rather than echoed
// into a redirect. Same rule the login and signup pages apply.
const INVITE_TOKEN = /^[A-Za-z0-9_-]{16,200}$/;

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

  // A redirect built from scratch would drop any session cookies the
  // getUser() call above just refreshed, so the visitor arrives at the
  // destination with the old cookies and is judged signed-out again. Every
  // redirect below carries them.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
  // /invite is matched (see config) so the session cookie is refreshed on
  // the way in, but it is public: an invitee typically has no session yet.
  const isBare = isBareAdminRoute(pathname);

  // Signed out, somewhere in the app: to sign-in, remembering where they
  // were going. The login and signup forms send them back to `next` once it
  // passes safeAdminNext (lib/admin-routes.ts).
  if (isAdminRoute && !isBare && !user) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectTo(url);
  }

  // Signed in, on the sign-in or sign-up screen: straight into the app. An
  // invited visitor keeps going to the invite's accept page instead, which
  // is what those screens did for a signed-in visitor before.
  if (user && (pathname === ADMIN_LOGIN || pathname === ADMIN_SIGNUP)) {
    const invite = request.nextUrl.searchParams.get("invite");
    const url = request.nextUrl.clone();
    url.pathname = invite && INVITE_TOKEN.test(invite) ? `/invite/${invite}` : ADMIN_HOME;
    url.search = "";
    return redirectTo(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/invite/:path*"],
};
