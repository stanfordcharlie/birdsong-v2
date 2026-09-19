import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { orgErrorResponse, requireActiveOrg } from "@/lib/org";

// POST /api/prospects/[id]/reset
// Admin-only. Puts a prospect back to pending after a test click on their
// personal link: deletes the response rows linked to them and clears
// started_at, completed_at and status, in one transaction (the
// reset_prospect function, see 20260918000001_reset_prospect.sql).
//
// Ownership is checked here, server-side, before anything runs: the
// prospect's study must belong to the caller's organization. The function
// itself refuses when a linked response is completed (real data) or has
// been pushed to HubSpot, and nothing is deleted on either refusal.

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // The user's own client: prospects has owner-only policies, so a prospect
  // outside this organization simply does not come back. The explicit org
  // filter on the study is belt and braces on top of that.
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, first_name, last_name, email, surveys!inner(org_id)")
    .eq("id", id)
    .eq("surveys.org_id", orgId)
    .maybeSingle();

  if (prospectError) {
    console.error("[prospects/reset] prospect lookup failed:", prospectError);
    return NextResponse.json({ error: prospectError.message }, { status: 500 });
  }
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reset_prospect", { p_prospect_id: id });

  if (error) {
    if (error.message.includes("completed_response")) {
      return NextResponse.json(
        { error: "This prospect finished their interview. That is real data, so it is not reset from here." },
        { status: 409 }
      );
    }
    if (error.message.includes("hubspot_synced")) {
      return NextResponse.json(
        { error: "This prospect's response was already pushed to HubSpot, so it is not reset from here." },
        { status: 409 }
      );
    }
    console.error(`[prospects/reset] prospect_id=${id} reset failed:`, error);
    return NextResponse.json({ error: "Couldn't reset that prospect" }, { status: 500 });
  }

  const deleted = (data as { deleted_responses?: number } | null)?.deleted_responses ?? 0;
  console.log(`[prospects/reset] prospect_id=${id} by user=${user.id}: deleted_responses=${deleted}`);
  return NextResponse.json({ ok: true, deleted_responses: deleted });
}
