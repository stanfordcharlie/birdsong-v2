import { createAdminClient } from "@/lib/supabase/admin";
import { userDisplayName } from "@/lib/user-name";
import type { Database } from "@/types/database";
import type { DisqualifyReason, LeadActivityType, LeadStatus } from "@/lib/leads/state";

// Server-only helpers under the lead server actions: the one write path
// into the trail, and the read that resolves actors to names. Not a
// "use server" module, so lib/hubspot-sync.ts can call applyLeadChange
// directly from the CRM push path.
//
// Everything here runs with the service role. lead_activity has no insert
// policy at all and apply_lead_change is not executable by any client role,
// so this module is the only way a trail row comes to exist. Callers own the
// permission check and the org-scoping check before they get here.

type Client = ReturnType<typeof createAdminClient>;

export type LeadRow = {
  id: string;
  orgId: string;
  leadStatus: LeadStatus;
  assignedTo: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * The lead, if it exists at all. Callers compare `orgId` to the active org
 * themselves and treat a mismatch exactly like a missing row: a response id
 * from another org must not be distinguishable from one that was never
 * created.
 */
export async function loadLeadRow(responseId: string, admin: Client = createAdminClient()): Promise<LeadRow | null> {
  if (!isUuid(responseId)) return null;
  const { data, error } = await admin
    .from("responses")
    .select("id, org_id, lead_status, assigned_to")
    .eq("id", responseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, orgId: data.org_id, leadStatus: data.lead_status, assignedTo: data.assigned_to };
}

export type LeadChange = {
  responseId: string;
  /** Null when Birdsong itself acted rather than a person. */
  actorId: string | null;
  type: LeadActivityType;
  /** Omit to leave the status alone. */
  toStatus?: LeadStatus;
  /** When present, sets the assignee (null clears it). */
  assignedTo?: string | null;
  disqualifyReason?: DisqualifyReason | null;
  disqualifyNote?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * One row mutation and its activity row, committed together
 * (public.apply_lead_change). Returns the new activity id.
 */
export async function applyLeadChange(change: LeadChange, admin: Client = createAdminClient()): Promise<string> {
  const setAssignee = change.assignedTo !== undefined;
  const { data, error } = await admin.rpc("apply_lead_change", {
    p_response_id: change.responseId,
    p_actor_id: change.actorId,
    p_type: change.type,
    p_to_status: change.toStatus ?? null,
    p_set_assignee: setAssignee,
    p_assigned_to: setAssignee ? change.assignedTo : null,
    p_disqualify_reason: change.disqualifyReason ?? null,
    p_disqualify_note: change.disqualifyNote ?? null,
    p_body: change.body ?? null,
    p_metadata: (change.metadata ?? null) as Database["public"]["Tables"]["lead_activity"]["Row"]["metadata"],
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Names

/**
 * Display names for a set of auth users, by id. auth.users is not reachable
 * through PostgREST, so this is one Auth admin call per distinct user,
 * which for a trail on one lead is a handful at most.
 */
export async function resolveUserNames(
  userIds: Iterable<string>,
  admin: Client = createAdminClient()
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  await Promise.all(
    Array.from(new Set(userIds)).map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const name = userDisplayName(data?.user ?? null);
      if (name) names.set(id, name);
    })
  );
  return names;
}

// ---------------------------------------------------------------------------
// The trail

export type LeadActivityEntry = {
  id: string;
  type: LeadActivityType;
  /** Null when Birdsong itself acted. */
  actorId: string | null;
  actorName: string | null;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  body: string | null;
  /** Assignee name for `assigned` entries, resolved the same way as actors. */
  assigneeName: string | null;
  disqualifyReason: DisqualifyReason | null;
  createdAt: string;
};

/** Newest first, with every person on it resolved to a name. */
export async function fetchLeadActivity(responseId: string, admin: Client = createAdminClient()): Promise<LeadActivityEntry[]> {
  const { data, error } = await admin
    .from("lead_activity")
    .select("id, type, actor_id, from_status, to_status, body, metadata, created_at")
    .eq("response_id", responseId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.actor_id) ids.add(row.actor_id);
    const assignee = metadataString(row.metadata, "assigned_to");
    if (assignee) ids.add(assignee);
  }
  const names = await resolveUserNames(ids, admin);

  return rows.map((row) => {
    const assignee = metadataString(row.metadata, "assigned_to");
    const reason = metadataString(row.metadata, "disqualify_reason");
    return {
      id: row.id,
      type: row.type,
      actorId: row.actor_id,
      actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      body: row.body,
      assigneeName: assignee ? (names.get(assignee) ?? null) : null,
      disqualifyReason: reason as DisqualifyReason | null,
      createdAt: row.created_at,
    };
  });
}

function metadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
