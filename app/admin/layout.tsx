import { AccountHeader } from "@/components/AccountHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page text-card-foreground">
      <AccountHeader />
      <main className="p-6">{children}</main>
    </div>
  );
}
