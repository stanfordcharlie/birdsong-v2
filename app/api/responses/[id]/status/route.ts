import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["new", "contacted", "qualified", "not_a_fit"] as const;
type ResponseStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(value: unknown): value is ResponseStatus {
  return typeof value === "string" && (ALLOWED_STATUSES as readonly string[]).includes(value);
}

// PATCH /api/responses/[id]/status
// Body: { status }
// Admin-only. Updates a response's pipeline status. Uses the
// cookie-authenticated client (not the service role), so the
// responses_owner_all RLS policy scopes the update to responses the
// calling admin actually owns without a separate ownership check here.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isAllowedStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase.from("responses").update({ status: body.status }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: body.status });
}
