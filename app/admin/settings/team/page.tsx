import { getCurrentUser } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { listMembers, listPendingInvites } from "@/lib/org-team";
import { TeamView } from "./TeamView";

// Every affordance on the Team page is decided here, from the permission
// matrix, and handed to the client view as booleans. The view never compares
// role strings itself; the server actions re-check before any write.
export default async function TeamPage() {
  const org = await requireActiveOrg();
  const user = await getCurrentUser();
  const [members, invites] = await Promise.all([
    listMembers(org.orgId),
    listPendingInvites(org.orgId),
  ]);

  return (
    <TeamView
      orgName={org.orgName}
      role={org.role}
      currentUserId={user?.id ?? ""}
      members={members}
      invites={invites}
      permissions={{
        invite: can(org.role, "member:invite"),
        remove: can(org.role, "member:remove"),
        changeRole: can(org.role, "member:changeRole"),
        rename: can(org.role, "org:rename"),
      }}
    />
  );
}
