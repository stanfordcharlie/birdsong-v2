import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, type OrgAction, type OrgRole } from "@/lib/org-permissions";

export { can, rolesAllowed, ORG_ROLES } from "@/lib/org-permissions";
export type { OrgAction, OrgRole } from "@/lib/org-permissions";

export type ActiveOrg = {
  orgId: string;
  role: OrgRole;
  orgName: string;
};

/**
 * Thrown by the require* helpers when the caller is signed in but may not
 * proceed. Route handlers turn it into a response with `status`; server
 * components let it surface as an error page, which is the loud failure the
 * "authenticated user with no membership" case is supposed to produce.
 */
export class OrgAccessError extends Error {
  readonly status: 403 | 500;
  constructor(message: string, status: 403 | 500) {
    super(message);
    this.name = "OrgAccessError";
    this.status = status;
  }
}

/**
 * The current user's active organization: their first membership by
 * created_at. Null when there is no session. Null for a signed-in user with
 * no membership is a data bug (signup always creates one), so it is logged
 * loudly here rather than left for the caller to notice.
 *
 * cache() dedupes this across the layout and every page/route in one render
 * pass, the same way getCurrentUser is deduped.
 */
export const getActiveOrg = cache(async (): Promise<ActiveOrg | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  // org_members' select policy shows every member of the caller's orgs, so
  // this filters to the caller's own rows rather than trusting the policy
  // to narrow it. (The only user_id filter that survives the org change: it
  // is the membership table itself.)
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[org] membership lookup failed for user ${user.id}:`, error.message);
    return null;
  }
  if (!data) {
    console.error(
      `[org] authenticated user ${user.id} (${user.email ?? "no email"}) has no org_members row; ` +
        "signup should have created a personal organization"
    );
    return null;
  }

  return {
    orgId: data.org_id,
    role: data.role,
    orgName: data.organizations?.name ?? "",
  };
});

/**
 * Like getActiveOrg, but a missing session redirects to login and a missing
 * membership throws. Use in server components and route handlers that cannot
 * do anything useful without an org.
 */
export async function requireActiveOrg(): Promise<ActiveOrg> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const org = await getActiveOrg();
  if (!org) {
    throw new OrgAccessError(
      `Signed-in user ${user.id} has no organization membership. Every account must belong to an organization.`,
      500
    );
  }
  return org;
}

/** The active org, or a 403 if the caller's role is not one of `roles`. */
export async function requireOrgRole(roles: OrgRole[]): Promise<ActiveOrg> {
  const org = await requireActiveOrg();
  if (!roles.includes(org.role)) {
    throw new OrgAccessError(`This action requires one of: ${roles.join(", ")}.`, 403);
  }
  return org;
}

/**
 * The active org, or a 403 if can(role, action) is false. This is the guard
 * mutation routes use, so the permission matrix is the single place a rule
 * lives.
 */
export async function requireOrgPermission(action: OrgAction): Promise<ActiveOrg> {
  const org = await requireActiveOrg();
  if (!can(org.role, action)) {
    throw new OrgAccessError(`Your role (${org.role}) cannot perform ${action}.`, 403);
  }
  return org;
}

// ---------------------------------------------------------------------------
// Org creation (service role). Called from the signup path only.

function slugifyLocalPart(localPart: string): string {
  const base = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "workspace";
}

function shortSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export function defaultOrgName(email: string | null | undefined, firstName?: string | null): string {
  const localPart = (email ?? "").split("@")[0] || "workspace";
  const base = firstName?.trim() || localPart.charAt(0).toUpperCase() + localPart.slice(1);
  return `${base}'s Workspace`;
}

/**
 * Creates a personal organization for a brand-new user and makes them its
 * owner. Idempotent: a user who already has a membership (an invited user,
 * in the next pass) gets nothing new and their existing first org back.
 *
 * Deliberately application code, not a trigger on auth.users: the invite
 * flow must be able to create a user WITHOUT giving them a personal org, and
 * that branch belongs in code that can see the invite.
 */
export async function createPersonalOrg(params: {
  userId: string;
  email: string | null;
  firstName?: string | null;
}): Promise<{ orgId: string; created: boolean }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return { orgId: existing.org_id, created: false };

  const name = defaultOrgName(params.email, params.firstName);
  const slugBase = slugifyLocalPart((params.email ?? "").split("@")[0] || "workspace");

  // The uuid suffix makes a collision vanishingly unlikely, but the slug is
  // UNIQUE and this must not fail a signup over it, so retry a few times.
  let orgId: string | null = null;
  for (let attempt = 0; attempt < 5 && !orgId; attempt++) {
    const { data, error } = await admin
      .from("organizations")
      .insert({ name, slug: `${slugBase}-${shortSuffix()}`, created_by: params.userId })
      .select("id")
      .single();
    if (!error) {
      orgId = data.id;
      break;
    }
    if (error.code !== "23505") throw error;
  }
  if (!orgId) throw new Error("Could not allocate a unique organization slug.");

  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: orgId, user_id: params.userId, role: "owner" });
  if (memberError) {
    // A concurrent signup request for the same user can race here; the
    // unique (org_id, user_id) makes the second insert a no-op rather than
    // a duplicate. Anything else is a real failure.
    if (memberError.code !== "23505") throw memberError;
  }

  return { orgId, created: true };
}

// ---------------------------------------------------------------------------
// Route-handler adapter.

/**
 * For route handlers: turns an OrgAccessError into the JSON response it
 * describes and rethrows anything else (including Next's own redirect
 * signal) untouched.
 */
export function orgErrorResponse(err: unknown): NextResponse {
  if (err instanceof OrgAccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}
