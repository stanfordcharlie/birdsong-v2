import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="font-semibold">
          Birdsong Admin
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex gap-4 text-sm text-neutral-600">
            <Link href="/admin" className="underline">
              Surveys
            </Link>
            <Link href="/admin/profile" className="underline">
              Company Profile
            </Link>
          </nav>
          {user && (
            <div className="flex items-center gap-3 border-l pl-6 text-sm text-neutral-600">
              <span>{user.email}</span>
              <SignOutButton />
            </div>
          )}
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
