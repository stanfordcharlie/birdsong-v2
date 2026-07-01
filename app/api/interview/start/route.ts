import { NextResponse } from "next/server";

// POST /api/interview/start
// Body: { surveySlug, respondentName, respondentEmail, respondentPhone?, customFieldValues? }
// Creates a `responses` row (unauthenticated, public) and returns the first
// interview message from Claude.
export async function POST() {
  // TODO: validate body, look up survey by slug, insert response row via the
  // admin client, call Claude for the opening question.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
