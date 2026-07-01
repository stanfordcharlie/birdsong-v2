import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from Supabase Auth (magic link / OAuth) and exchanges
// the code for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
