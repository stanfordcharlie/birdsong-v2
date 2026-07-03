import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountHeader } from "@/components/AccountHeader";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-page">
      {user && <AccountHeader />}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-card-foreground">Birdsong</h1>
          <p className="text-sm text-muted-foreground">
            AI-moderated survey platform for B2B demand gen.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/admin/surveys/new">Create a new survey</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin">Admin</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/signup">Sign up</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/profile">Company Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
