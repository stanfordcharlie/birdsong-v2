import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractProfileFromPaste } from "@/lib/profile-onboarding/paste-extract";

// POST /api/profile/ai-fill
// Body: { pastedText }
// Admin-only. Extracts whatever company-profile fields the pasted text
// supports and returns them; never writes to the database itself. The
// wizard's own autosave is what persists anything, once the admin reviews
// and steps through it.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { pastedText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pastedText = body.pastedText?.trim();
  if (!pastedText) {
    return NextResponse.json({ error: "Paste your AI's response first" }, { status: 400 });
  }

  try {
    const result = await extractProfileFromPaste(pastedText);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/profile/ai-fill] extraction failed", err);
    return NextResponse.json({ error: "Failed to extract a profile from that text" }, { status: 502 });
  }
}
