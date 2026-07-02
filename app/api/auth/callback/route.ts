import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logLoginEvent } from "@/lib/auth-events";

// Handles the redirect from Supabase Auth (magic link, OAuth, or an email
// confirmation link) and exchanges the code for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user) {
      await logLoginEvent(supabase, data.user.id, data.user.email ?? null);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
