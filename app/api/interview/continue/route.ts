import { NextResponse } from "next/server";

// POST /api/interview/continue
// Body: { responseId, message }
// Appends the respondent's message, calls Claude for the next turn (or to
// wrap up + score the lead once the interview is complete), and persists
// the updated transcript.
export async function POST() {
  // TODO: load the response row, append message, call Claude, extract pain
  // points / lead score on completion, persist, and notify via Resend when
  // the lead is hot.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
