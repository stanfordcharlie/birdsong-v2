import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountHeader } from "@/components/AccountHeader";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      {user && <AccountHeader />}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Birdsong</h1>
          <p className="text-sm text-neutral-500">
            AI-moderated survey platform for B2B demand gen.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/surveys/new"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Create a new survey
          </Link>
          <Link
            href="/admin"
            className="rounded border px-4 py-2 text-sm text-neutral-900"
          >
            Admin
          </Link>
          <Link
            href="/admin/signup"
            className="rounded border px-4 py-2 text-sm text-neutral-900"
          >
            Sign up
          </Link>
          <Link
            href="/admin/profile"
            className="rounded border px-4 py-2 text-sm text-neutral-900"
          >
            Company Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
