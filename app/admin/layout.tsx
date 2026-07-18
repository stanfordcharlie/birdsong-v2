import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { userDisplayName } from "@/lib/user-name";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("contact_name").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const displayName = userDisplayName(user, profile?.contact_name);
  const userInitial = (displayName?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <AdminShell userName={displayName} userInitial={userInitial}>
      {children}
    </AdminShell>
  );
}
