"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation so middleware re-reads the now-cleared auth cookies.
    window.location.assign("/admin/login");
  }

  return (
    <button type="button" onClick={handleSignOut} className="text-sm text-neutral-600 underline">
      Sign out
    </button>
  );
}
