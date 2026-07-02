import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="font-semibold">
          Birdsong Admin
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href="/admin" className="underline">
            Surveys
          </Link>
          <Link href="/admin/profile" className="underline">
            Company Profile
          </Link>
          <Link href="/admin/roadmap" className="underline">
            Roadmap
          </Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
