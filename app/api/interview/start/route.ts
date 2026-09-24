import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import {
  createInterviewTurn,
  modelParams,
  describeModelResponse,
  getAnthropicClient,
  logModelFailure,
} from "@/lib/interview/anthropic";
import { buildInterviewSystemPrompt, buildKickoffMessage } from "@/lib/interview-prompt";
import { interviewPacing } from "@/lib/interview/pacing";
import { interviewLengthPreset } from "@/lib/studies/interview-length";
import { chipsFor, parseChips } from "@/lib/interview/chips";
import { generateSessionToken } from "@/lib/interview/token";
import { getClientIp, isRateLimited, startRateLimiter } from "@/lib/interview/rate-limit";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  isValidEmail,
  sanitizeCustomFieldValues,
  truncate,
} from "@/lib/interview/validation";
import { deriveCompanyNameFromDomain, extractEmailDomain, isFreeEmailDomain } from "@/lib/interview/work-email";
import { OUTBOUND_SOURCE, reserveSystemSources, sanitizeSource } from "@/lib/interview/source";
import {
  markProspectStarted,
  resolveProspectForStart,
  type ProspectForStart,
} from "@/lib/prospects/lookup";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Json } from "@/types/database";

// POST /api/interview/start
// Body: { survey_id, respondent_name?, respondent_email, respondent_phone?, custom_field_values?, source? }
// respondent_email must be a work address (see isFreeEmailDomain below) — it's
// how a company name gets derived now that there's no separate company field
// by default. Creates a `responses` row (unauthenticated, public) and returns
// the first interview message from Claude.
//
// CAPTCHA (e.g. Turnstile/hCaptcha) would slot in right here, verified
// before the rate-limit check below even runs — not added in this pass.
export async function POST(request: Request) {
  // Short enough to read back from a screen, unique enough to grep a log.
  const requestId = crypto.randomUUID().split("-")[0];
  let body: {
    survey_id?: string;
    is_test?: unknown;
    source?: unknown;
    prospect_token?: unknown;
    respondent_name?: string;
    respondent_email?: string;
    respondent_phone?: string;
    custom_field_values?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { survey_id, respondent_phone, custom_field_values } = body;

  if (!survey_id || typeof survey_id !== "string") {
    return NextResponse.json({ error: "survey_id is required" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  if (await isRateLimited(startRateLimiter, clientIp)) {
    return NextResponse.json(
      { error: "Too many interviews started from this connection, please try again in a bit." },
      { status: 429 }
    );
  }

  // A prospect link (/study/[slug]/[token]) proves who the caller is, so the
  // identity fields below come from the record rather than from the body.
  // The TOKEN is what the client sends and what is re-resolved here: a body
  // that simply named a prospect_id would let any caller file a response as
  // anyone they could guess. Null for a missing, malformed, unknown, or
  // wrong-survey token, which is just the anonymous path.
  const prospect: ProspectForStart | null = await resolveProspectForStart(body.prospect_token, survey_id);

  // Attribution. A resolved token is proof the person came through outbound,
  // so the server sets the source itself and any ?src= on the URL is ignored:
  // a query string is something anyone can edit, a token is not. Anonymous
  // traffic keeps its tag. Never trust the client's own cleaning
  // (InterviewFlow.tsx sanitizes ?src= for UX, but a direct caller could send
  // anything) — re-sanitized independently here, and the value reserved for
  // the outbound row is dropped so a hand-typed tag cannot pose as it. Null
  // when absent or when it sanitizes down to nothing: untagged, "Direct".
  const source = prospect ? OUTBOUND_SOURCE : reserveSystemSources(sanitizeSource(body.source));

  const respondent_name = prospect
    ? prospect.name
    : typeof body.respondent_name === "string"
      ? truncate(body.respondent_name.trim(), NAME_MAX_LENGTH)
      : undefined;

  // The body's address is ignored entirely for a prospect — the invite went
  // to one mailbox, and the person holding the token does not get to
  // redirect the gift card to another.
  const respondent_email = prospect
    ? prospect.email
    : typeof body.respondent_email === "string"
      ? truncate(body.respondent_email.trim(), EMAIL_MAX_LENGTH)
      : undefined;

  if (!respondent_email) {
    return NextResponse.json({ error: "A work email is required." }, { status: 400 });
  }
  if (!isValidEmail(respondent_email)) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }

  // Never trust the client's own blocklist check (InterviewFlow.tsx runs
  // the same one for inline UX, but a direct caller could skip it) — this
  // is the actual gate, and it's also where the company name gets derived
  // since the domain only exists once the address has passed validation.
  const emailDomain = extractEmailDomain(respondent_email);
  if (!emailDomain) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }
  // The work-email rule exists to stop a respondent typing a personal
  // address into the form. A prospect typed nothing: this is the address we
  // chose to mail, from a list we built, and the respondent has no field to
  // correct it in — so enforcing the rule here would lock out an invited
  // person over our own data, with no path forward. Whether a free-domain
  // contact belongs on the list is a question for the import, not for the
  // moment they show up to answer.
  if (isFreeEmailDomain(emailDomain) && !prospect) {
    return NextResponse.json(
      { error: "Please use your work email so we can send your gift card" },
      { status: 400 }
    );
  }
  // The prospect record's own company name wins when we have one: it is the
  // enriched value, where the domain guess is a heuristic on the string
  // before the dot.
  const derivedCompanyName = prospect?.companyName || deriveCompanyNameFromDomain(emailDomain);

  const sanitizedCustomFieldValues = {
    ...sanitizeCustomFieldValues(custom_field_values),
    email_domain: emailDomain,
    derived_company_name: derivedCompanyName,
  };

  console.log(`[interview/start] survey_id=${survey_id} respondent_email=${respondent_email ?? "none"}`);

  const supabase = createAdminClient();

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", survey_id)
    .maybeSingle();

  if (surveyError) {
    console.error("[interview/start] survey lookup failed:", surveyError);
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }
  if (!survey) {
    console.error(`[interview/start] survey not found for id=${survey_id}`);
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  // A test run is only honored when the caller's cookie session belongs to
  // this survey's owner — the body flag alone is never trusted, so a
  // random caller sending is_test:true gets the normal rules (including
  // the draft gate below) with the flag silently ignored.
  let isTest = false;
  if (body.is_test === true) {
    const cookieClient = await createCookieClient();
    const {
      data: { user },
    } = await cookieClient.auth.getUser();
    if (user && user.id === survey.user_id) {
      isTest = true;
      console.log(`[interview/start] test run by owner for survey_id=${survey_id}`);
    }
  }

  // Defense in depth: the public survey page already gates on this, but
  // this endpoint is directly callable and must not trust that a caller
  // came through the gated page. Checked before any Anthropic call or
  // responses row is created, so a draft survey never burns tokens or
  // pollutes the lead queue. Owner-verified test runs are exempt — the
  // point of previewing is doing it before the survey goes live.
  if (survey.status !== "live" && !isTest) {
    console.error(`[interview/start] survey_id=${survey_id} is not live (status=${survey.status})`);
    return NextResponse.json({ error: "This study isn't available" }, { status: 403 });
  }

  // A prospect who already began and came back — a reopened tab, a second
  // device, a link clicked again a day later. Their interview is resumed,
  // not restarted: a second responses row for the same invite would be the
  // duplicate lead this whole feature exists to avoid, and it would throw
  // away everything they already said.
  //
  // Placed deliberately BEFORE the Anthropic call below, so a returning
  // prospect costs a lookup rather than a generated opening question they
  // will never see. The client takes the id and token from here to
  // /api/interview/resume, which is the one implementation of rejoining an
  // interview — this route does not grow a second copy of it.
  //
  // Reading their own session_token back out is not an escalation: the token
  // in their URL already authorizes this interview, and it is the same token
  // their own tab was given when they started.
  if (prospect) {
    const { data: existing, error: existingError } = await supabase
      .from("responses")
      .select("id, session_token")
      .eq("prospect_id", prospect.id)
      .eq("survey_id", survey_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("[interview/start] prospect response lookup failed:", existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (existing) {
      console.log(
        `[interview/start] prospect_id=${prospect.id} already has response_id=${existing.id}; resuming`
      );
      return NextResponse.json({
        resume: true,
        response_id: existing.id,
        token: existing.session_token,
      });
    }
  }

  // The sponsoring organization's company profile (what they sell, target
  // ICP, value prop), used to keep the interview anchored to the company's
  // actual product surface area instead of drifting wherever the
  // respondent's last answer leads. By org, not by the survey's creator: a
  // study created by a teammate still belongs to the same company.
  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("org_id", survey.org_id)
    .maybeSingle();

  const respondent = {
    name: respondent_name ?? null,
    customFieldValues: sanitizedCustomFieldValues,
  };

  const anthropic = getAnthropicClient();
  const preset = interviewLengthPreset(survey.interview_length);
  const systemPrompt = buildInterviewSystemPrompt({
    survey,
    companyProfile: profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null,
    respondent,
    // An empty transcript: this call generates the opening question, which
    // is topic 1 whatever the model reports.
    pacing: interviewPacing([], preset),
  });

  // One retry on an empty reply or a retryable error, both attempts logged
  // (createInterviewTurn). A non-retryable error still throws as before.
  const { completion, rawText: rawOpeningQuestion } = await createInterviewTurn(
    anthropic,
    {
      // No thinking, 1024 tokens: see the continue route.
      ...modelParams({ maxTokens: 1024, thinking: "off" }),
      system: systemPrompt,
      messages: [{ role: "user", content: buildKickoffMessage(respondent) }],
    },
    { scope: "interview/start", requestId, fields: { surveyId: survey_id } }
  );

  if (!rawOpeningQuestion) {
    // Both attempts came back with no text; each is already in the log.
    return NextResponse.json({ error: "Failed to generate opening question" }, { status: 502 });
  }

  const parsed = parseChips(rawOpeningQuestion);
  const openingQuestion = parsed.text;
  // Only a factual question gets chips, and never a way out (chipsFor).
  const chips = chipsFor(parsed);

  // A non-empty reply can still parse down to nothing — most obviously when
  // the whole message is a chips block, or when an unclosed ||CHIPS opener
  // lands early enough that stripping from it leaves no prose. The
  // rawOpeningQuestion check above can't catch that, and without this the
  // empty string would be persisted and rendered as a blank first message.
  // Deliberately no placeholder substitution: a fabricated opening question
  // is worse than a failed start the respondent can retry.
  if (!openingQuestion) {
    logModelFailure("interview/start", requestId, "parse_chips", {
      surveyId: survey_id,
      ...describeModelResponse(completion, rawOpeningQuestion),
    });
    return NextResponse.json({ error: "Failed to generate opening question" }, { status: 502 });
  }

  const messages: InterviewMessage[] = [{ role: "assistant", content: openingQuestion, topic: 1 }];

  // Bound to this row and required on every /api/interview/continue call
  // from here on, so a guessable response_id UUID alone is never enough to
  // post messages into someone else's interview.
  const sessionToken = generateSessionToken();

  const { data: response, error: insertError } = await supabase
    .from("responses")
    .insert({
      survey_id,
      respondent_name: respondent_name ?? null,
      respondent_email: respondent_email ?? null,
      respondent_phone: respondent_phone ?? null,
      custom_field_values: sanitizedCustomFieldValues as Json,
      messages: messages as unknown as Json,
      session_token: sessionToken,
      source,
      ...(isTest ? { is_test: true } : {}),
      ...(prospect ? { prospect_id: prospect.id } : {}),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[interview/start] responses insert failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log(`[interview/start] created response_id=${response.id} for survey_id=${survey_id}`);

  // After the row exists, never before: started_at means "this invite
  // produced an interview", and stamping it ahead of a failed insert would
  // make the prospects table claim an interview that does not exist. Its own
  // failures are logged and swallowed inside — the respondent is already in
  // a live conversation, and losing invite bookkeeping is not a reason to
  // hand them an error.
  if (prospect) {
    await markProspectStarted(prospect.id);
  }

  return NextResponse.json({
    response_id: response.id,
    message: openingQuestion,
    chips,
    token: sessionToken,
    topic: 1,
    topicCount: preset.topics,
  });
}
