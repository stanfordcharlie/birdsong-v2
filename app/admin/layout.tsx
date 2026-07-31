import { cookies } from "next/headers";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { AdminChrome } from "@/components/AdminChrome";
import { userFullName } from "@/lib/user-name";

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

  // userFullName, not userDisplayName: the sidebar plate shows this as a
  // person's name in serif and falls back to "Account" on its own, so an
  // email address there would read as a mistake rather than a fallback.
  const displayName = userFullName(user, profile?.contact_name);

  // Feeds the plate's "Listening · N live" line. Counts what the Surveys
  // list's Live filter counts — status 'live' and not archived — rather
  // than status alone, so an archived survey never reads as still
  // listening. head:true means only the count crosses the wire.
  const { count: liveSurveyCount } = user
    ? await supabase
        .from("surveys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "live")
        .is("archived_at", null)
    : { count: 0 };

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  return (
    <AdminChrome
      userName={displayName}
      liveSurveyCount={liveSurveyCount ?? 0}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </AdminChrome>
  );
}
