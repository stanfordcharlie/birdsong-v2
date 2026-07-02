"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation so middleware/server components re-read the
    // now-cleared auth cookies.
    window.location.assign("/");
  }

  return (
    <button type="button" onClick={handleSignOut} className="text-sm text-neutral-600 underline">
      Sign out
    </button>
  );
}
