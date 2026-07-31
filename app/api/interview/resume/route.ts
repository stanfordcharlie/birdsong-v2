import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLOSING_MESSAGE } from "@/lib/interview-prompt";
import { parseChips } from "@/lib/interview/chips";
import { sessionTokenIsValid } from "@/lib/interview/token";
import { lastAssistantContent, toPublicTranscript, withLastAssistantContent } from "@/lib/interview/resume";
import { getClientIp, isRateLimited, resumeRateLimiter } from "@/lib/interview/rate-limit";

// POST /api/interview/resume
// Body: { response_id, token }
// Hands a reloaded tab back the interview it was already in: the stored
// transcript, or the fact that it already finished. Read-only. It never
// creates a row, never calls Anthropic, and never advances the interview.
//
// Public and hostile-facing exactly like start and continue: response_id is
// an enumerable UUID, so the session token minted at start is the only thing
// that authorizes this, and the failure response is deliberately identical
// for "no such response" and "wrong token" so it cannot be used to test
// whether a given id exists.
const NOT_AVAILABLE = { error: "This interview session is no longer available." };

export async function POST(request: Request) {
  let body: { response_id?: unknown; token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { response_id, token } = body;

  if (!response_id || typeof response_id !== "string") {
    return NextResponse.json({ error: "response_id is required" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  if (await isRateLimited(resumeRateLimiter, clientIp)) {
    return NextResponse.json(
      { error: "Too many attempts from this connection, please try again in a bit." },
      { status: 429 }
    );
  }

  const supabase = createAdminClient();

  // Service-role read on behalf of an unauthenticated caller, so the exact
  // columns are named: never select("*") here. session_token is read only to
  // compare against and is never returned. Nothing else on the row (scores,
  // extraction output, respondent contact details, is_test, source) is
  // fetched at all, so there is no path by which it could be serialized into
  // the response.
  const { data: response, error: fetchError } = await supabase
    .from("responses")
    .select("id, completed, messages, session_token")
    .eq("id", response_id)
    .maybeSingle();

  if (fetchError) {
    console.error("[interview/resume] responses fetch failed:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Same shape, same status, for a missing row and a bad token.
  if (!response || !sessionTokenIsValid(token, response.session_token)) {
    console.error(`[interview/resume] response_id=${response_id} not found or token rejected`);
    return NextResponse.json(NOT_AVAILABLE, { status: 404 });
  }

  if (response.completed) {
    console.log(`[interview/resume] response_id=${response_id} already completed`);
    // No closing message is stored on the row, so this is the same constant
    // /api/interview/continue returns when it completes an interview, which
    // keeps a resumed completion screen reading identically to a live one.
    return NextResponse.json({ complete: true, message: CLOSING_MESSAGE });
  }

  const messages = toPublicTranscript(response.messages);
  const lastQuestion = lastAssistantContent(messages);

  // Nothing to restore into: the transcript is empty or has no interviewer
  // turn, so there is no question to put back on screen. Treated as a failed
  // resume rather than dropping the respondent into a blank chat stage.
  if (!lastQuestion) {
    console.error(`[interview/resume] response_id=${response_id} has no assistant turn to resume into`);
    return NextResponse.json(NOT_AVAILABLE, { status: 404 });
  }

  // Chips are stripped from the model's reply before the transcript is ever
  // persisted (both start and continue store the parsed text), so in practice
  // this yields an empty array and the restored question comes back without
  // its quick replies. Running the stored content through the one existing
  // parser anyway means a row that somehow does hold a raw block still gets
  // handled correctly, and there is no second chip parser to keep in sync.
  const { text: parsedQuestion, chips } = parseChips(lastQuestion);

  // Only reachable if a raw block was stored: the delimiter must never be
  // rendered, so the transcript carries the parsed text. An empty result
  // means the stored question was nothing but a chips block, which leaves
  // no question to restore.
  if (!parsedQuestion) {
    console.error(`[interview/resume] response_id=${response_id} last question was empty after chip parsing`);
    return NextResponse.json(NOT_AVAILABLE, { status: 404 });
  }
  const publicMessages =
    parsedQuestion === lastQuestion ? messages : withLastAssistantContent(messages, parsedQuestion);

  console.log(`[interview/resume] response_id=${response_id} resumed with ${messages.length} messages`);

  return NextResponse.json({ complete: false, messages: publicMessages, chips });
}
