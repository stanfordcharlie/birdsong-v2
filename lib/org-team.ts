import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFullName } from "@/lib/user-name";
import { sendOrgInvite } from "@/lib/email/org-invite";
import type { OrgRole } from "@/lib/org-permissions";

// Team membership and invites: every read and write here runs with the
// service role, because org_members and org_invites have no client write
// policies at all (see 20260903000005 and 20260903100000). The role checks
// that decide WHO may call each function live in the server actions
// (app/admin/settings/team/actions.ts); the rules about WHAT a given role
// may do to a given target live here, so they are enforced once.

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Thrown for a rule violation the UI should show as a sentence. */
export class TeamRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamRuleError";
  }
}

export type TeamMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: OrgRole;
  joinedAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: OrgRole;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
};

export type InviteLookup = {
  id: string;
  orgId: string;
  orgName: string;
  email: string;
  role: OrgRole;
  invitedByName: string | null;
  expiresAt: string;
  acceptedAt: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function expiresInAWeek(): string {
  return new Date(Date.now() + INVITE_TTL_MS).toISOString();
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// auth.users is not reachable through PostgREST, so names and emails come
// from the Auth admin API one user at a time. Teams are small; this is
// cheap, and it never needs a second data path for names.
async function userSummary(userId: string): Promise<{ name: string | null; email: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const user = data?.user ?? null;
  return { name: userFullName(user), email: user?.email ?? null };
}

// No lookup-by-email exists on the admin API, so this pages through users.
// Fine at this scale; noted in the final report as the thing to replace if
// the user table ever gets large.
async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const target = normalizeEmail(email);
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reads

export async function listMembers(orgId: string): Promise<TeamMember[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (m) => {
      const { name, email } = await userSummary(m.user_id);
      return { userId: m.user_id, name, email, role: m.role, joinedAt: m.created_at };
    })
  );
}

export async function listPendingInvites(orgId: string): Promise<PendingInvite[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("org_invites")
    .select("id, email, role, invited_by, expires_at, created_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const inviterNames = new Map<string, string | null>();
  const now = Date.now();
  return Promise.all(
    (data ?? []).map(async (invite) => {
      let invitedByName: string | null = null;
      if (invite.invited_by) {
        if (!inviterNames.has(invite.invited_by)) {
          const { name, email } = await userSummary(invite.invited_by);
          inviterNames.set(invite.invited_by, name ?? email);
        }
        invitedByName = inviterNames.get(invite.invited_by) ?? null;
      }
      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedByName,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
        expired: new Date(invite.expires_at).getTime() < now,
      };
    })
  );
}

export async function getInviteByToken(token: string): Promise<InviteLookup | null> {
  if (!token || token.length > 200) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_invites")
    .select("id, org_id, email, role, invited_by, expires_at, accepted_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;

  let invitedByName: string | null = null;
  if (data.invited_by) {
    const { name, email } = await userSummary(data.invited_by);
    invitedByName = name ?? email;
  }
  return {
    id: data.id,
    orgId: data.org_id,
    orgName: data.organizations?.name ?? "",
    email: data.email,
    role: data.role,
    invitedByName,
    expiresAt: data.expires_at,
    acceptedAt: data.accepted_at,
  };
}

export function inviteIsRedeemable(invite: InviteLookup | null): invite is InviteLookup {
  return (
    !!invite && invite.acceptedAt === null && new Date(invite.expiresAt).getTime() > Date.now()
  );
}

// ---------------------------------------------------------------------------
// Writes. `actor` is the signed-in user performing the action, already
// verified by the caller to hold the matrix permission for it.

export async function inviteMember(params: {
  orgId: string;
  orgName: string;
  actor: { userId: string; name: string | null; email: string | null };
  email: string;
  role: "admin" | "member";
}): Promise<void> {
  const admin = createAdminClient();
  const email = normalizeEmail(params.email);
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email)) {
    throw new TeamRuleError("Enter a valid email address.");
  }
  if (params.role !== "admin" && params.role !== "member") {
    throw new TeamRuleError("Invites can only be sent as admin or member.");
  }

  const existingUserId = await findUserIdByEmail(email);
  if (existingUserId) {
    const { data: membership } = await admin
      .from("org_members")
      .select("id")
      .eq("org_id", params.orgId)
      .eq("user_id", existingUserId)
      .maybeSingle();
    if (membership) throw new TeamRuleError(`${email} is already a member of this team.`);
  }

  const { data: pending } = await admin
    .from("org_invites")
    .select("id, expires_at")
    .eq("org_id", params.orgId)
    .ilike("email", email)
    .is("accepted_at", null)
    .maybeSingle();
  if (pending) {
    if (new Date(pending.expires_at).getTime() > Date.now()) {
      throw new TeamRuleError(`${email} already has a pending invite. Resend it instead.`);
    }
    // An expired, never-accepted invite is dead weight and would trip the
    // one-pending-per-address index, so it makes way for the new one.
    await admin.from("org_invites").delete().eq("id", pending.id);
  }

  const token = newToken();
  const expiresAt = expiresInAWeek();
  const { data: invite, error } = await admin
    .from("org_invites")
    .insert({
      org_id: params.orgId,
      email,
      role: params.role,
      token,
      invited_by: params.actor.userId,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  try {
    await sendOrgInvite({
      to: email,
      orgName: params.orgName,
      inviterName: params.actor.name ?? params.actor.email ?? "A teammate",
      role: params.role,
      acceptUrl: `${appUrl()}/invite/${token}`,
      expiresAt,
    });
  } catch (err) {
    // No email means no way to redeem it; leaving the row would only block
    // a retry with the one-pending-per-address index.
    await admin.from("org_invites").delete().eq("id", invite.id);
    throw err;
  }
}

export async function resendInvite(params: {
  orgId: string;
  orgName: string;
  actor: { userId: string; name: string | null; email: string | null };
  inviteId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("org_invites")
    .select("id, email, role")
    .eq("id", params.inviteId)
    .eq("org_id", params.orgId)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) throw new TeamRuleError("That invite no longer exists.");
  if (invite.role === "owner") throw new TeamRuleError("Invites cannot carry the owner role.");

  // A fresh token every time: the old link stops working, so a resend also
  // serves as "the previous email went astray".
  const token = newToken();
  const expiresAt = expiresInAWeek();
  const { error } = await admin
    .from("org_invites")
    .update({ token, expires_at: expiresAt, invited_by: params.actor.userId })
    .eq("id", invite.id);
  if (error) throw error;

  await sendOrgInvite({
    to: invite.email,
    orgName: params.orgName,
    inviterName: params.actor.name ?? params.actor.email ?? "A teammate",
    role: invite.role,
    acceptUrl: `${appUrl()}/invite/${token}`,
    expiresAt,
  });
}

export async function revokeInvite(params: { orgId: string; inviteId: string }): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("org_invites")
    .delete()
    .eq("id", params.inviteId)
    .eq("org_id", params.orgId)
    .is("accepted_at", null);
  if (error) throw error;
}

async function memberRole(orgId: string, userId: string): Promise<OrgRole | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

/**
 * Removes a member. Rules, in order: the owner is never removed; anyone may
 * remove themselves (except the owner); an admin may not remove another
 * admin, only the owner may.
 */
export async function removeMember(params: {
  orgId: string;
  actor: { userId: string; role: OrgRole };
  targetUserId: string;
}): Promise<{ removedSelf: boolean }> {
  const admin = createAdminClient();
  const targetRole = await memberRole(params.orgId, params.targetUserId);
  if (!targetRole) throw new TeamRuleError("That person is not a member of this team.");
  if (targetRole === "owner") {
    throw new TeamRuleError("The owner cannot be removed. Transfer ownership first.");
  }

  const removingSelf = params.targetUserId === params.actor.userId;
  if (!removingSelf) {
    if (params.actor.role === "admin" && targetRole === "admin") {
      throw new TeamRuleError("Only the owner can remove another admin.");
    }
    if (params.actor.role === "member") {
      throw new TeamRuleError("Members can only remove themselves.");
    }
  }

  const { error } = await admin
    .from("org_members")
    .delete()
    .eq("org_id", params.orgId)
    .eq("user_id", params.targetUserId);
  if (error) throw error;
  return { removedSelf: removingSelf };
}

/**
 * Changes a member's role. The owner's role never changes except through a
 * transfer, which only the owner can do; only the owner can make someone an
 * admin. Transfer demotes the previous owner to admin in one transaction
 * (transfer_org_ownership).
 */
export async function changeRole(params: {
  orgId: string;
  actor: { userId: string; role: OrgRole };
  targetUserId: string;
  role: OrgRole;
}): Promise<void> {
  const admin = createAdminClient();
  const targetRole = await memberRole(params.orgId, params.targetUserId);
  if (!targetRole) throw new TeamRuleError("That person is not a member of this team.");
  if (targetRole === "owner") {
    throw new TeamRuleError("The owner's role can only change by transferring ownership.");
  }
  if (targetRole === params.role) return;

  if (params.role === "owner") {
    if (params.actor.role !== "owner") {
      throw new TeamRuleError("Only the owner can transfer ownership.");
    }
    const { error } = await admin.rpc("transfer_org_ownership", {
      target_org: params.orgId,
      new_owner: params.targetUserId,
    });
    if (error) throw error;
    return;
  }

  if (params.role === "admin" && params.actor.role !== "owner") {
    throw new TeamRuleError("Only the owner can make someone an admin.");
  }
  if (targetRole === "admin" && params.actor.role !== "owner") {
    throw new TeamRuleError("Only the owner can change another admin's role.");
  }

  const { error } = await admin
    .from("org_members")
    .update({ role: params.role })
    .eq("org_id", params.orgId)
    .eq("user_id", params.targetUserId);
  if (error) throw error;
}

export async function renameOrg(params: { orgId: string; name: string }): Promise<string> {
  const admin = createAdminClient();
  const name = params.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new TeamRuleError("Team names are between 2 and 80 characters.");
  }
  const { error } = await admin.from("organizations").update({ name }).eq("id", params.orgId);
  if (error) throw error;
  return name;
}

/**
 * Redeems an invite for the signed-in user. The email match is the whole
 * security model of a leaked link, so it is checked here as well as by the
 * page that calls this.
 */
export async function acceptInvite(params: {
  token: string;
  user: { id: string; email: string | null };
}): Promise<{ orgId: string }> {
  const admin = createAdminClient();
  const invite = await getInviteByToken(params.token);
  if (!inviteIsRedeemable(invite)) throw new TeamRuleError("This invite is no longer valid.");
  if (normalizeEmail(params.user.email ?? "") !== normalizeEmail(invite.email)) {
    throw new TeamRuleError("This invite was sent to a different email address.");
  }

  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: invite.orgId, user_id: params.user.id, role: invite.role });
  // 23505: already a member (e.g. a double-submit). The invite is still
  // consumed below, which is the right end state either way.
  if (memberError && memberError.code !== "23505") throw memberError;

  const { error: acceptError } = await admin
    .from("org_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("accepted_at", null);
  if (acceptError) throw acceptError;

  return { orgId: invite.orgId };
}
