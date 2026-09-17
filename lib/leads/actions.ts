"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, OrgAccessError, requireActiveOrg, requireOrgPermission, type ActiveOrg } from "@/lib/org";
import {
  canTransition,
  isDisqualifyReason,
  isLeadStatus,
  LEAD_STATUS_LABELS,
  type DisqualifyReason,
  type LeadStatus,
} from "@/lib/leads/state";
import {
  applyLeadChange,
  fetchLeadActivity,
  loadLeadRow,
  resolveUserNames,
  type LeadActivityEntry,
  type LeadRow,
} from "@/lib/leads/activity";

// The lead workflow's server actions. Every one of them:
//
//   1. re-derives the caller's org and role on the server and checks the
//      permission matrix (can()) for the action, independently of whatever
//      the UI chose to show;
//   2. loads the target response with the service role and refuses it unless
//      it belongs to the active org, so a response id from the client is
//      never trusted to be in scope;
//   3. writes through apply_lead_change, which commits the row change and
//      its activity row together.
//
// Nothing about the caller is read from the arguments: a client names a
// target, never itself.

export type LeadActionResult =
  | { ok: true; status: LeadStatus; assignedTo: string | null; assigneeName: string | null }
  | { ok: false; error: string };

/** A rule violation the UI shows as a sentence. */
class LeadRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadRuleError";
  }
}

const NOTE_MAX_LENGTH = 4000;

function fail(err: unknown): LeadActionResult {
  if (err instanceof LeadRuleError || err instanceof OrgAccessError) {
    return { ok: false, error: err.message };
  }
  console.error("[leads] action failed:", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

async function actorId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new OrgAccessError("Not signed in.", 403);
  return user.id;
}

/** The lead, or a not-found error that reads the same for "other org". */
async function leadInOrg(responseId: string, org: ActiveOrg): Promise<LeadRow> {
  const lead = await loadLeadRow(responseId);
  if (!lead || lead.orgId !== org.orgId) throw new LeadRuleError("That lead could not be found.");
  return lead;
}

async function isOrgMember(orgId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function nameOf(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const names = await resolveUserNames([userId]);
  return names.get(userId) ?? null;
}

function revalidateLead(responseId: string) {
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/responses/${responseId}`);
  // The home page's "Awaiting contact" stat reads the mirrored status.
  revalidatePath("/admin");
}

async function finish(responseId: string): Promise<LeadActionResult> {
  const lead = await loadLeadRow(responseId);
  if (!lead) throw new LeadRuleError("That lead could not be found.");
  revalidateLead(responseId);
  return {
    ok: true,
    status: lead.leadStatus,
    assignedTo: lead.assignedTo,
    assigneeName: await nameOf(lead.assignedTo),
  };
}

// ---------------------------------------------------------------------------
// Assignment

/**
 * Any org member. Takes the lead for the acting user. A lead already held by
 * someone else is refused: taking it over is assignLead, a management call.
 */
export async function claimLead(responseId: string): Promise<LeadActionResult> {
  try {
    const org = await requireOrgPermission("lead:claim");
    const me = await actorId();
    const lead = await leadInOrg(responseId, org);

    if (lead.assignedTo === me) return finish(responseId);
    if (lead.assignedTo) {
      const holder = (await nameOf(lead.assignedTo)) ?? "a teammate";
      throw new LeadRuleError(`This lead is already assigned to ${holder}. An admin can reassign it.`);
    }

    await applyLeadChange({
      responseId,
      actorId: me,
      type: "assigned",
      assignedTo: me,
      toStatus: lead.leadStatus === "new" ? "assigned" : undefined,
      metadata: { assigned_to: me, self: true },
    });
    return finish(responseId);
  } catch (err) {
    return fail(err);
  }
}

/** Owner or admin. Hands the lead to a teammate, who must be in the org. */
export async function assignLead(responseId: string, userId: string): Promise<LeadActionResult> {
  try {
    const org = await requireOrgPermission("lead:assignOthers");
    const me = await actorId();
    const lead = await leadInOrg(responseId, org);

    if (typeof userId !== "string" || !(await isOrgMember(org.orgId, userId))) {
      throw new LeadRuleError("That person is not a member of this team.");
    }
    if (lead.assignedTo === userId) return finish(responseId);

    await applyLeadChange({
      responseId,
      actorId: me,
      type: "assigned",
      assignedTo: userId,
      toStatus: lead.leadStatus === "new" ? "assigned" : undefined,
      metadata: { assigned_to: userId, self: userId === me, previous: lead.assignedTo },
    });
    return finish(responseId);
  } catch (err) {
    return fail(err);
  }
}

/** The assignee, or an owner or admin. Drops an untouched lead back to new. */
export async function unassignLead(responseId: string): Promise<LeadActionResult> {
  try {
    const org = await requireActiveOrg();
    const me = await actorId();
    const lead = await leadInOrg(responseId, org);

    if (!lead.assignedTo) throw new LeadRuleError("This lead is not assigned to anyone.");
    const mine = lead.assignedTo === me;
    if (!mine && !can(org.role, "lead:assignOthers")) {
      throw new OrgAccessError("Only the assignee or an admin can unassign this lead.", 403);
    }
    if (mine && !can(org.role, "lead:claim")) {
      throw new OrgAccessError(`Your role (${org.role}) cannot change lead assignment.`, 403);
    }

    await applyLeadChange({
      responseId,
      actorId: me,
      type: "unassigned",
      assignedTo: null,
      toStatus: lead.leadStatus === "assigned" ? "new" : undefined,
      metadata: { previous: lead.assignedTo },
    });
    return finish(responseId);
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Status

export type SetLeadStatusOptions = {
  disqualifyReason?: string | null;
  disqualifyNote?: string | null;
};

/**
 * Any org member. The move must be legal per lib/leads/state.ts, and a move
 * to disqualified must say why (and, for "other", in what words).
 */
export async function setLeadStatus(
  responseId: string,
  status: string,
  opts: SetLeadStatusOptions = {}
): Promise<LeadActionResult> {
  try {
    const org = await requireOrgPermission("lead:setStatus");
    const me = await actorId();
    const lead = await leadInOrg(responseId, org);

    if (!isLeadStatus(status)) throw new LeadRuleError("That is not a lead status.");
    if (status === lead.leadStatus) return finish(responseId);
    if (!canTransition(lead.leadStatus, status)) {
      throw new LeadRuleError(
        `A lead cannot move from ${LEAD_STATUS_LABELS[lead.leadStatus]} to ${LEAD_STATUS_LABELS[status]}.`
      );
    }

    let disqualifyReason: DisqualifyReason | null = null;
    let disqualifyNote: string | null = null;
    if (status === "disqualified") {
      if (!isDisqualifyReason(opts.disqualifyReason)) {
        throw new LeadRuleError("Choose a reason to disqualify this lead.");
      }
      disqualifyReason = opts.disqualifyReason;
      disqualifyNote = (opts.disqualifyNote ?? "").trim() || null;
      if (disqualifyReason === "other" && !disqualifyNote) {
        throw new LeadRuleError("Say why in a note when the reason is Other.");
      }
      if (disqualifyNote && disqualifyNote.length > NOTE_MAX_LENGTH) {
        throw new LeadRuleError(`Notes are at most ${NOTE_MAX_LENGTH} characters.`);
      }
    }

    await applyLeadChange({
      responseId,
      actorId: me,
      type: "status_change",
      toStatus: status,
      disqualifyReason,
      disqualifyNote,
      body: disqualifyNote,
      metadata: disqualifyReason ? { disqualify_reason: disqualifyReason } : null,
    });
    return finish(responseId);
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Notes and the trail

/** Any org member. Notes are immutable: there is no edit and no delete. */
export async function addLeadNote(responseId: string, body: string): Promise<LeadActionResult> {
  try {
    const org = await requireOrgPermission("lead:note");
    const me = await actorId();
    await leadInOrg(responseId, org);

    const text = typeof body === "string" ? body.trim() : "";
    if (!text) throw new LeadRuleError("Write something before adding a note.");
    if (text.length > NOTE_MAX_LENGTH) {
      throw new LeadRuleError(`Notes are at most ${NOTE_MAX_LENGTH} characters.`);
    }

    await applyLeadChange({ responseId, actorId: me, type: "note", body: text });
    return finish(responseId);
  } catch (err) {
    return fail(err);
  }
}

/** Any org member. The trail, newest first, with actors resolved to names. */
export async function getLeadActivity(responseId: string): Promise<LeadActivityEntry[]> {
  const org = await requireActiveOrg();
  const lead = await loadLeadRow(responseId);
  if (!lead || lead.orgId !== org.orgId) return [];
  return fetchLeadActivity(responseId);
}
