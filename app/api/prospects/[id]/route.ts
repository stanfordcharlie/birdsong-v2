import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { orgErrorResponse, requireActiveOrg } from "@/lib/org";

// DELETE /api/prospects/[id]
// Admin-only. Removes one prospect from a study's roster: the row goes, so
// their personal link stops resolving and they drop out of the export.
//
// What happens to a linked response follows the reset rules
// (20260918000001_reset_prospect.sql). An unfinished session that was never
// pushed to HubSpot is test debris and is deleted with the prospect. A
// completed interview, or one already synced to HubSpot, is real data: it
// stays in Leads, detached from the prospect by the foreign key's
// on-delete-set-null.
//
// Ownership is checked here, server-side, before anything runs: the
// prospect's study must belong to the caller's organization. The mutation
// itself runs with the service role, as reset does, so the check above is
// the whole gate.

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let orgId: string;
  try {
    ({ orgId } = await requireActiveOrg());
  } catch (err) {
    return orgErrorResponse(err);
  }

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, surveys!inner(org_id)")
    .eq("id", id)
    .eq("surveys.org_id", orgId)
    .maybeSingle();

  if (prospectError) {
    console.error("[prospects/[id] DELETE] prospect lookup failed:", prospectError);
    return NextResponse.json({ error: prospectError.message }, { status: 500 });
  }
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Unfinished, unsynced sessions first, so a prospect deleted mid-test does
  // not leave an orphaned half-interview behind in Leads.
  const { data: removed, error: responsesError } = await admin
    .from("responses")
    .delete()
    .eq("prospect_id", id)
    .eq("completed", false)
    .is("hubspot_contact_id", null)
    .is("hubspot_deal_id", null)
    .is("hubspot_synced_at", null)
    .select("id");

  if (responsesError) {
    console.error(`[prospects/[id] DELETE] prospect_id=${id} response cleanup failed:`, responsesError);
    return NextResponse.json({ error: "Couldn't delete that prospect" }, { status: 500 });
  }

  const { error: deleteError } = await admin.from("prospects").delete().eq("id", id);

  if (deleteError) {
    console.error(`[prospects/[id] DELETE] prospect_id=${id} delete failed:`, deleteError);
    return NextResponse.json({ error: "Couldn't delete that prospect" }, { status: 500 });
  }

  const deletedResponses = removed?.length ?? 0;
  console.log(
    `[prospects/[id] DELETE] prospect_id=${id} by user=${user.id}: deleted_responses=${deletedResponses}`
  );
  return NextResponse.json({ deleted: true, deleted_responses: deletedResponses });
}
