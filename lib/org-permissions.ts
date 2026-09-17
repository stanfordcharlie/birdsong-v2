// The one permission matrix. Every UI gate and every route guard reads from
// can(); nothing else in the codebase compares role strings directly.
//
// Kept free of server-only imports (no next/headers, no Supabase) so client
// components can import it for UI gating in the next pass.

export type OrgRole = "owner" | "admin" | "member";

export const ORG_ROLES: readonly OrgRole[] = ["owner", "admin", "member"];

export type OrgAction =
  | "study:create"
  | "study:edit"
  | "study:delete"
  | "study:view"
  | "response:view"
  | "response:update"
  | "response:pushToCrm"
  | "report:generate"
  | "report:publish"
  | "profile:edit"
  | "member:invite"
  | "member:remove"
  | "member:changeRole"
  | "org:rename"
  | "org:delete"
  | "lead:claim"
  | "lead:assignOthers"
  | "lead:setStatus"
  | "lead:note";

const OWNER_ADMIN: readonly OrgRole[] = ["owner", "admin"];
const EVERYONE: readonly OrgRole[] = ["owner", "admin", "member"];
const OWNER_ONLY: readonly OrgRole[] = ["owner"];

const MATRIX: Record<OrgAction, readonly OrgRole[]> = {
  "study:create": OWNER_ADMIN,
  "study:edit": OWNER_ADMIN,
  "study:delete": OWNER_ADMIN,
  "study:view": EVERYONE,
  "response:view": EVERYONE,
  "response:update": EVERYONE,
  "response:pushToCrm": EVERYONE,
  "report:generate": OWNER_ADMIN,
  "report:publish": OWNER_ADMIN,
  "profile:edit": OWNER_ADMIN,
  "member:invite": OWNER_ADMIN,
  "member:remove": OWNER_ADMIN,
  "member:changeRole": OWNER_ADMIN,
  "org:rename": OWNER_ADMIN,
  "org:delete": OWNER_ONLY,
  // The lead queue is every member's job; handing a lead to someone else is
  // a management call.
  "lead:claim": EVERYONE,
  "lead:assignOthers": OWNER_ADMIN,
  "lead:setStatus": EVERYONE,
  "lead:note": EVERYONE,
};

export function can(role: OrgRole | null | undefined, action: OrgAction): boolean {
  if (!role) return false;
  return MATRIX[action].includes(role);
}

/** Every role allowed to perform an action, for callers that need the list. */
export function rolesAllowed(action: OrgAction): readonly OrgRole[] {
  return MATRIX[action];
}
