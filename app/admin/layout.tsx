import { cookies } from "next/headers";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { AdminChrome } from "@/components/AdminChrome";
import { userFullName } from "@/lib/user-name";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  // Null on the bare auth routes (no session), and null for a signed-in
  // user with no membership, which getActiveOrg logs loudly. The layout
  // itself must still render either way, so nothing here throws.
  const org = user ? await getActiveOrg() : null;

  // The company profile is the organization's row, one per org.
  const { data: profile } = org
    ? await supabase.from("profiles").select("contact_name").eq("org_id", org.orgId).maybeSingle()
    : { data: null };

  // userFullName, not userDisplayName: the sidebar plate shows this as a
  // person's name in serif and falls back to "Account" on its own, so an
  // email address there would read as a mistake rather than a fallback.
  const displayName = userFullName(user, profile?.contact_name);
  const roleLabel = org ? org.role.charAt(0).toUpperCase() + org.role.slice(1) : null;

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  return (
    <AdminChrome userName={displayName} userRole={roleLabel} sidebarCollapsed={sidebarCollapsed}>
      {children}
    </AdminChrome>
  );
}
