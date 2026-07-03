import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

// Shown on /admin/* pages always, and on the homepage only when a session
// exists — logged-out visitors to the homepage get the plain hero instead.
export async function AccountHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-6 py-4">
      <Link href="/" className="font-semibold text-sidebar-active-foreground">
        Birdsong Admin
      </Link>
      <div className="flex items-center gap-6">
        <nav className="flex gap-5 text-sm font-medium">
          <Link
            href="/admin"
            className="text-sidebar-foreground transition-colors hover:text-sidebar-active-foreground"
          >
            Surveys
          </Link>
          <Link
            href="/admin/profile"
            className="text-sidebar-foreground transition-colors hover:text-sidebar-active-foreground"
          >
            Company Profile
          </Link>
        </nav>
        {user && (
          <div className="flex items-center gap-3 border-l border-sidebar-border pl-6 text-sm text-sidebar-foreground">
            <span>{user.email}</span>
            <SignOutButton />
          </div>
        )}
      </div>
    </header>
  );
}
