import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { excludeArchivedStudies } from "@/lib/lead-queue";
import { AdminChrome } from "@/components/AdminChrome";
import type { SidebarData, SidebarStudy } from "@/components/AdminSidebar";
import { SearchShortcut } from "@/components/admin/SearchShortcut";
import { userFullName } from "@/lib/user-name";

// How many studies the sidebar lists. Live ones first, then drafts.
const SIDEBAR_STUDIES_MAX = 8;

const EMPTY_SIDEBAR: SidebarData = {
  studies: [],
  unworkedLeads: null,
  liveCount: null,
  canCreateStudy: false,
};

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

  let contactName: string | null = null;
  let sidebar = EMPTY_SIDEBAR;

  if (org) {
    // The same reads the pages make, so the rail and the page it sits beside
    // cannot disagree: the study list is Home's (explicit org filter, because
    // surveys has a public-read policy), and the unworked count is the Leads
    // queue's "Unworked" tab (completed, status new, study not archived, test
    // responses left out as the queue leaves them out by default).
    const [{ data: profile }, { data: surveys }, { count: unworked, error: unworkedError }] =
      await Promise.all([
        supabase.from("profiles").select("contact_name").eq("org_id", org.orgId).maybeSingle(),
        // The study list and every study's response count in one read: the
        // embedded count is an aggregate over the study's responses, and the
        // filter on the embed narrows what is counted (test responses out,
        // as the Projects page tallies them) without dropping a study that
        // has none.
        supabase
          .from("surveys")
          .select("id, title, status, responses(count)")
          .eq("org_id", org.orgId)
          .is("archived_at", null)
          .eq("responses.is_test", false)
          .order("created_at", { ascending: false }),
        excludeArchivedStudies(
          supabase
            .from("responses")
            .select("id, surveys!inner(archived_at)", { count: "exact", head: true })
            .eq("completed", true)
            .eq("is_test", false)
            .eq("lead_status", "new")
        ),
      ]);

    contactName = profile?.contact_name ?? null;

    const all = surveys ?? [];
    const listed = [
      ...all.filter((s) => s.status === "live"),
      ...all.filter((s) => s.status === "draft"),
    ].slice(0, SIDEBAR_STUDIES_MAX);

    // A draft has no responses to count. A live study whose count did not
    // come back shows no number rather than a zero.
    const studies: SidebarStudy[] = listed.map((s) => {
      if (s.status !== "live") {
        return { id: s.id, title: s.title, status: "draft" as const, responseCount: null };
      }
      const count = s.responses?.[0]?.count;
      return {
        id: s.id,
        title: s.title,
        status: "live" as const,
        responseCount: typeof count === "number" ? count : null,
      };
    });

    sidebar = {
      studies,
      unworkedLeads: unworkedError ? null : (unworked ?? 0),
      // Who is in an interview right now is Realtime Presence, read in the
      // browser by the Live page; there is no query behind it, so the rail
      // shows no number rather than a made-up one.
      liveCount: null,
      canCreateStudy: can(org.role, "study:create"),
    };
  }

  // userFullName, not userDisplayName: the account row shows this as a
  // person's name and falls back to "Account" on its own, so an email
  // address there would read as a mistake rather than a fallback.
  const displayName = userFullName(user, contactName);

  return (
    <AdminChrome userName={displayName} workspaceName={org?.orgName || null} sidebar={sidebar}>
      {/* ⌘K on every signed-in admin route; not on the auth screens. */}
      {user && <SearchShortcut />}
      {children}
    </AdminChrome>
  );
}
