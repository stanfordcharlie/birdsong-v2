import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logLoginEvent } from "@/lib/auth-events";

// Handles the redirect from Supabase Auth (email confirmation link, magic
// link, OAuth) and exchanges the ?code= for a session, setting the auth
// cookies, before sending the now-signed-in user on to `next` (default
// /admin). This is the one route that must receive the code — Supabase's
// email link points here via the signup call's emailRedirectTo, and the site
// root also forwards a stray ?code= here (see app/page.tsx) in case Supabase
// falls back to the Site URL.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only ever redirect to a same-origin path. A `next` of "//evil.com" or an
  // absolute URL would otherwise be an open redirect.
  const rawNext = searchParams.get("next") ?? "/admin";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin";

  if (!code) {
    console.error("[auth/callback] no code present on callback request");
    return NextResponse.redirect(`${origin}/admin/login?error=confirmation`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // Expired or already-used codes land here. Send them to login with a clear
  // message instead of dumping them somewhere with a raw error in the URL.
  if (error || !data.user) {
    console.error("[auth/callback] code exchange failed:", error?.message ?? "no user returned");
    return NextResponse.redirect(`${origin}/admin/login?error=confirmation`);
  }

  await logLoginEvent(supabase, data.user.id, data.user.email ?? null);
  return NextResponse.redirect(`${origin}${next}`);
}
