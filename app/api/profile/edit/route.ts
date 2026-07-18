import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editProfile } from "@/lib/profile-onboarding/edit";
import type { CompanyProfileEditFields } from "@/lib/profile-onboarding/edit";

// POST /api/profile/edit
// Body: { instruction, current }
// Admin-only. Applies a plain-language edit instruction to the admin's
// current company profile fields and returns the updated values plus a
// short confirmation. Doesn't persist anything itself — the admin still
// reviews and saves via the same form used for editing fields directly.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { instruction?: string; current?: CompanyProfileEditFields };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { instruction, current } = body;
  if (!instruction?.trim()) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  }
  if (!current) {
    return NextResponse.json({ error: "current is required" }, { status: 400 });
  }

  try {
    const result = await editProfile(current, instruction);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to apply the requested edit" }, { status: 502 });
  }
}
