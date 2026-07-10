import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AdminShell userEmail={user?.email ?? null}>{children}</AdminShell>;
}
