import { getCurrentUser } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return <AdminShell userEmail={user?.email ?? null}>{children}</AdminShell>;
}
