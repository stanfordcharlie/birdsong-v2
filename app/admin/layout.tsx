import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-page text-card-foreground">
      <AdminSidebar />
      <main className="flex-1 pl-14">{children}</main>
    </div>
  );
}
