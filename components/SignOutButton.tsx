"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation so middleware/server components re-read the
    // now-cleared auth cookies.
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        "text-sm text-sidebar-foreground transition-colors hover:text-sidebar-active-foreground",
        className
      )}
    >
      Sign out
    </button>
  );
}
