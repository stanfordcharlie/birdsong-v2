import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orgErrorResponse, requireOrgPermission } from "@/lib/org";
import { excludeDeletedResponses } from "@/lib/responses/visibility";

// POST /api/responses/delete
// Body: { ids: string[] }
//
// Soft-deletes one or many responses: sets deleted_at, which every admin read
// filters on (lib/responses/visibility.ts). The row, its transcript and its
// HubSpot ids stay, and nothing in HubSpot is touched; the dialog says so
// before it asks.
//
// One route for one row and for a selection, so the check and the write have
// a single implementation. The cookie-authenticated client does the update,
// so "org members update responses" scopes it to the caller's organization:
// ids belonging to another org simply do not match and are reported as not
// deleted rather than refused as a whole. The role check is
// requireOrgPermission, and the database enforces the same rule a second time
// (the guard_response_soft_delete trigger), so a member cannot reach this
// through a hand-written request either.
//
// Already-deleted ids are excluded from the update, which keeps deleted_at at
// the first delete's timestamp and makes a double submit a no-op rather than
// a silent re-stamp.

/** One operator action on one screenful of rows. Well above any real table page. */
const MAX_IDS = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DeleteResponsesResult = {
  /** Ids that were visible, in this org, and are now deleted. */
  deleted: string[];
  /** Ids that matched nothing: another org's, already deleted, or gone. */
  notDeleted: string[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await requireOrgPermission("response:delete");
  } catch (err) {
    return orgErrorResponse(err);
  }

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "Pick at least one response to delete" }, { status: 400 });
  }
  if (body.ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `That is more than ${MAX_IDS} responses at once. Delete them in smaller batches.` },
      { status: 400 }
    );
  }
  const ids = Array.from(new Set(body.ids.filter((id): id is string => typeof id === "string" && UUID.test(id))));
  if (ids.length === 0) {
    return NextResponse.json({ error: "Pick at least one response to delete" }, { status: 400 });
  }

  const { data, error } = await excludeDeletedResponses(
    supabase.from("responses").update({ deleted_at: new Date().toISOString() }).in("id", ids)
  ).select("id");

  if (error) {
    console.error("[responses/delete] update failed:", error);
    return NextResponse.json({ error: "Couldn't delete those responses" }, { status: 500 });
  }

  const deleted = (data ?? []).map((row) => row.id);
  const deletedSet = new Set(deleted);
  return NextResponse.json({
    deleted,
    notDeleted: ids.filter((id) => !deletedSet.has(id)),
  } satisfies DeleteResponsesResult);
}
