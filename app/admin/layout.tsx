export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <span className="font-semibold">Birdsong Admin</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
