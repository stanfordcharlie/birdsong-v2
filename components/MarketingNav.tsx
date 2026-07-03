import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/SignOutButton";

export async function MarketingNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/home" className="text-lg font-semibold text-card-foreground">
        Birdsong
      </Link>
      {user ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user.email}</span>
          <SignOutButton />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/admin/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/signup">Get Started</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
