"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { OrgAccessError, requireActiveOrg, requireOrgPermission } from "@/lib/org";
import { userFullName } from "@/lib/user-name";
import * as team from "@/lib/org-team";
import type { OrgRole } from "@/lib/org-permissions";

// Every action re-derives the caller's org and role on the server and checks
// the permission matrix before touching anything. Nothing about the caller
// is read from the arguments: a client can name a target, never itself.

export type ActionResult = { ok: true } | { ok: false; error: string };

const TEAM_PATH = "/admin/settings/team";

function fail(err: unknown): ActionResult {
  if (err instanceof team.TeamRuleError || err instanceof OrgAccessError) {
    return { ok: false, error: err.message };
  }
  console.error("[team] action failed:", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

async function actor() {
  const user = await getCurrentUser();
  if (!user) throw new OrgAccessError("Not signed in.", 403);
  return { userId: user.id, name: userFullName(user), email: user.email ?? null };
}

export async function inviteMemberAction(email: string, role: string): Promise<ActionResult> {
  try {
    const org = await requireOrgPermission("member:invite");
    if (role !== "admin" && role !== "member") {
      return { ok: false, error: "Invites can only be sent as admin or member." };
    }
    await team.inviteMember({
      orgId: org.orgId,
      orgName: org.orgName,
      actor: await actor(),
      email,
      role,
    });
    revalidatePath(TEAM_PATH);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function resendInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    const org = await requireOrgPermission("member:invite");
    await team.resendInvite({ orgId: org.orgId, orgName: org.orgName, actor: await actor(), inviteId });
    revalidatePath(TEAM_PATH);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    const org = await requireOrgPermission("member:invite");
    await team.revokeInvite({ orgId: org.orgId, inviteId });
    revalidatePath(TEAM_PATH);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  let removedSelf = false;
  try {
    // Self-removal is open to every role, so the matrix check only applies
    // when the target is someone else. lib/org-team enforces the rest.
    const org = await requireActiveOrg();
    const me = await actor();
    if (userId !== me.userId) await requireOrgPermission("member:remove");
    ({ removedSelf } = await team.removeMember({
      orgId: org.orgId,
      actor: { userId: me.userId, role: org.role as OrgRole },
      targetUserId: userId,
    }));
    revalidatePath(TEAM_PATH);
  } catch (err) {
    return fail(err);
  }
  if (removedSelf) {
    // Nothing left to show this person: the session's only organization is
    // gone. Sign out and land on login rather than an error page.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
  }
  return { ok: true };
}

export async function changeRoleAction(userId: string, role: string): Promise<ActionResult> {
  try {
    const org = await requireOrgPermission("member:changeRole");
    if (role !== "owner" && role !== "admin" && role !== "member") {
      return { ok: false, error: "Unknown role." };
    }
    const me = await actor();
    await team.changeRole({
      orgId: org.orgId,
      actor: { userId: me.userId, role: org.role as OrgRole },
      targetUserId: userId,
      role,
    });
    revalidatePath(TEAM_PATH);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function renameOrgAction(name: string): Promise<ActionResult> {
  try {
    const org = await requireOrgPermission("org:rename");
    await team.renameOrg({ orgId: org.orgId, name });
    revalidatePath(TEAM_PATH);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
