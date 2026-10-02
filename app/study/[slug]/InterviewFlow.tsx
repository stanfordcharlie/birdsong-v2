"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";
import {
  parseCustomRespondentFieldDefs,
  parseEnabledRespondentFields,
  parsePresetFieldLabel,
  parsePresetFieldRequired,
} from "@/lib/studies/respondent-fields";
import { extractEmailDomain, isFreeEmailDomain } from "@/lib/interview/work-email";
import {
  activeSessionStorageKey,
  parseActiveSession,
  serializeActiveSession,
} from "@/lib/interview/active-session";
import {
  InterviewerRow,
  SkyBackdrop,
  SkyCard,
  SkyFlock,
  SkyHeader,
  StudyArrow,
  StudyError,
  StudyFooter,
  ThinkingDots,
} from "./SkyChrome";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useLoadingGate, useFlybyGate } from "@/components/useLoadingGate";
import { emphasisSegments, extractEmphasis } from "@/lib/chat/emphasis";
import { renderEmphasis } from "@/lib/chat/render-emphasis";
import { splitQuestion, stripBold } from "@/lib/interview/split-question";
import { interviewDurationLabel, interviewLengthPreset } from "@/lib/studies/interview-length";
import { stripInterviewMarkers } from "@/lib/interview/chips";
import { interviewProgressPercent } from "./progress";
import { useStudyPresence } from "@/lib/presence/use-study-presence";
import { giftCardPhrase } from "@/lib/studies/incentive";
import { cn } from "@/lib/utils";

// Design reference: design_handoff_respondent_survey_sky/. The respondent
// flow sits on the same sky as the marketing homepage: blue gradient, warm sun
// glow, a drifting flock, a frosted pill header and frosted cream cards, with
// Instrument Serif carrying every headline.
//
// Colours, radii and spacing come from the --study-* tokens (app/globals.css,
// `.study-sky`) through the `study-*` Tailwind utilities, so all of it follows
// the day/night toggle. Do not reintroduce raw hex here: a literal will not
// switch, and a single one is enough to make a themed screen look broken. The
// two that exist are on cream fills that are deliberately the same in both
// themes, and each is marked at its call site.
//
// The shared chrome (sky, flock, header, card, footer) lives in ./SkyChrome.

// The respondent-facing survey shape: an explicit allowlist of the only
// fields this public Client Component is permitted to see. Derived via Pick
// from the full Row so field types stay in sync, but structurally it CANNOT
// name an internal field (topic, question_guide, tone, num_questions,
// target_*, etc.) — referencing survey.topic here is a compile error, which
// is the point. The page (app/study/[slug]/page.tsx) constructs exactly
// this object; nothing else reaches the browser.
export type PublicSurvey = Pick<
  Database["public"]["Tables"]["surveys"]["Row"],
  | "id"
  | "title"
  | "external_title"
  | "sponsor"
  | "public_description"
  | "gift_card_amount"
  | "gift_card_brand"
  | "custom_fields"
>;
// A resolved prospect link (/study/[slug]/[token]), or null on the generic
// link. Everything here is either the recipient's own contact detail or the
// token already sitting in their address bar, so none of it is new exposure —
// but it is still an explicit allowlist, and the enrichment the prospects row
// also holds (apollo_id, firmographics, company_domain) is deliberately not
// on it. See lib/prospects/lookup.ts.
export type ProspectContext = {
  id: string;
  // Re-verified server-side on every start call. The client is never trusted
  // to assert WHICH prospect it is — it hands back the same secret it was
  // given, and the start route resolves it again.
  token: string;
  firstName: string | null;
  fullName: string | null;
  email: string;
  companyName: string | null;
  title: string | null;
  alreadyStarted: boolean;
};

// "prospect" is the gated landing beat that replaces "welcome" for an invited
// prospect: same design, greeted, and with the intake already answered. It
// exists so that arriving at a link and starting an interview are two
// different events — see the note on the start button below.
type Stage = "prospect" | "welcome" | "intro" | "chat" | "complete";

// The ink pill every primary action uses: the intake's Start and the question
// screen's Continue. Chip-coloured text on an ink fill, both of which flip
// with the theme together.
const PRIMARY_BUTTON =
  "study-cta inline-flex touch-manipulation items-center gap-[10px] rounded-full bg-study-ink px-[20px] py-[15px] text-[17px] font-medium text-study-chip disabled:cursor-not-allowed disabled:opacity-35 sm:px-[26px]";

const FIELD_LABEL_CLASSES = "text-[13px] font-medium text-study-muted";

// The intake fields, on the same chip fill and hairline the answer box and the
// quick-answer chips use, so the form reads as part of one card system.
//
// text-[17px] is load-bearing on iOS, not just a type choice: Safari
// auto-zooms the whole page on focus for any input under 16px and never zooms
// back out. min-h-[48px] is the touch-target floor; on desktop the padding and
// line box already clear it, so it changes nothing there.
const FIELD_INPUT_BASE =
  "w-full min-w-0 min-h-[48px] rounded-[16px] border border-study-hair bg-study-chip py-[12px] text-[17px] text-study-ink placeholder:text-study-muted/75 focus:border-study-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

// The welcome H1 at the handoff's size, with two concessions it does not make
// itself: a width term, and a ceiling that gives way to a long title.
//
// The handoff sizes this on viewport height alone (9.5vh), which is right for
// the desktop screen it draws and wrong on a phone, where 9.5vh of an 844px
// screen is an 80px headline in a 390px-wide column — four words a line, and
// the CTA pushed under the fold. min() with a vw term is what holds it; on
// any window wide enough to show the interviewer card the vh term is still
// the smaller of the two, so the reference renders unchanged.
//
// The ceiling is the long-title case: titles are usually short (the AI
// suggestion flow caps at ~8 words), but an admin can type anything, and this
// heading sits on a screen that must not scroll. It only starts shrinking past
// a length the handoff's own title does not reach.
function welcomeTitleFontSize(title: string): string {
  const MAX_PX = 104;
  const MIN_PX = 32;
  const SHRINK_AFTER = 56;
  const PX_PER_CHAR = 1.1;
  const ceiling = Math.max(MIN_PX, MAX_PX - Math.max(0, title.length - SHRINK_AFTER) * PX_PER_CHAR);
  return `clamp(${MIN_PX}px, min(9.5vh, 11vw), ${ceiling}px)`;
}

// One row of the welcome card: a serif heading over a line of muted body text,
// with a hairline under all but the last.
function WelcomeCardRow({
  heading,
  body,
  divided = false,
}: {
  heading: string;
  body: string;
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        divided && "mb-[clamp(12px,2vh,24px)] border-b border-study-hair pb-[clamp(12px,2vh,24px)]",
      )}
    >
      <div className="mb-[6px] font-study-serif text-[clamp(24px,3.2vh,34px)] leading-[1.1]">
        {heading}
      </div>
      <div className="text-[17px] leading-[1.55] text-study-muted">{body}</div>
    </div>
  );
}

// No skip sentinel exists in the interview prompt/model (out of scope to
// add one here), so Skip sends a plain, natural-reading reply the
// interviewer's existing evasive-answer handling can react to normally.
const SKIP_MESSAGE_CONTENT = "I'd rather not answer that one.";

// The chat progress bar is a single fill over how many questions have been
// asked against the study's length preset (./progress.ts). It carries no
// number and no segments: a respondent is never told how many questions are
// left, and a bar made of one pip per topic told them anyway. The preset it
// measures against is the same one behind the welcome screen's "About N
// minutes", so the promise and the progress cannot disagree.
//
// It deliberately no longer follows the ||TOPIC: n|| marker. See ./progress.ts
// for what that cost.

const EMAIL_LIVE_CHECK_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// What test mode types into the intake form on the owner's behalf. Static,
// so two previews of the same survey differ only in what the owner actually
// says — a run-to-run diff of the transcript is then meaningful. Every
// enabled field gets a value, including the preset optionals, so a survey
// that marks any of them required still passes firstMissingRequiredField
// and starts rather than erroring on a form nobody can see.
const TEST_RESPONDENT = {
  name: "Test Respondent",
  phone: "(555) 010-0000",
  jobTitle: "Test Job Title",
  company: "Test Company",
  linkedin: "https://www.linkedin.com/in/test-respondent",
  customField: "Test value",
} as const;

// The email is the one value that varies: a fixed address would collide on
// the same respondent record every run. ?testEmail= (owner-verified by the
// page) pins it when reusing one address across runs is the point.
function testRespondentEmail(pinned: string | null): string {
  return pinned?.trim() || `test+${Math.floor(Date.now() / 1000)}@example.com`;
}

// Progressively formats the phone field as a US number — "(925) 948-4350" —
// as the respondent types. Re-derived from the digits on every keystroke, so
// it self-heals when they backspace (deleting a separator just re-strips the
// digit behind it). Capped at 10 digits (US NANP). Non-US respondents are
// rare for this field, which is optional; the raw digits are still what any
// downstream dialer needs, and they remain recoverable from the display form.
function formatUsPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// How incoming interviewer questions arrive. Flip in one line:
//   "pop"  — the full question rises and settles: fade + 10px rise + slight
//            scale, 300ms ease-out (default)
//   "fade" — plain 200ms opacity fade, no movement
//   "none" — instant render, no animation
// All three collapse to an instant render under prefers-reduced-motion (the
// classes are gated in globals.css; resting state is fully visible).
type QuestionReveal = "pop" | "fade" | "none";
const QUESTION_REVEAL: QuestionReveal = "pop";

// How long the typing dots take to fade out before the question lands —
// keep in sync with TypingDots' motion-safe:duration-150.
const DOTS_FADE_MS = 150;

// The last thing the chat screen does is fill its progress bar. Without this
// the interview's final answer swaps straight to the thank-you screen and the
// bar's run to 100% happens in the same commit that unmounts it, which is to
// say never. Matches the bar's own transition; skipped entirely under
// reduced motion, where there is no fill to watch.
const FINAL_FILL_MS = 700;

// If a respondent starts typing a follow-up thought right after sending
// (e.g. they forgot to mention something) before the next question has
// appeared, don't let it pop in over them mid-keystroke: hold it back
// until they've paused typing for this long.
const TYPING_PAUSE_MS = 10000;

// The topic on screen: the one the last interviewer message belongs to,
// held inside the bar. A transcript from before topics existed reads as
// topic 1 throughout, which is the honest thing to show for it.
function displayedTopicNumber(messages: InterviewMessage[], total: number): number {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  const topic = typeof last?.topic === "number" && last.topic >= 1 ? last.topic : 1;
  return Math.min(topic, Math.max(1, total));
}

// Respondents are one-and-done: a survey they've already finished should
// never show the intro form again, whether from revisiting the URL, a hard
// refresh, or (in dev) a Fast Refresh remount. localStorage, not just React
// state, is what makes that stick across a full page reload.
function completionStorageKey(surveyId: string) {
  return `birdsong-survey-complete:${surveyId}`;
}

// Live name/email validation tick (intro only): pops in via the `pop`
// keyframe (globals.css). motion-reduce:animate-none, not a settled-state
// class, since the icon's presence (not its entrance) carries the actual
// validity signal — reduced-motion users still see it, just without the pop.
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("motion-reduce:animate-none", className)}
      style={{ animation: "pop 0.25s ease both" }}
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="rgb(var(--study-ink))"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Invalid-state counterpart to CheckIcon (email only): shown once the
// respondent has left the field (or tried to submit) with a value that
// doesn't parse as an email, and swaps to the check the moment it does.
// Not shown while they're still mid-typing a fresh address — flashing red
// at "cha…" would just be noise.
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("motion-reduce:animate-none", className)}
      style={{ animation: "pop 0.25s ease both" }}
    >
      <path
        d="M6.5 6.5l11 11M17.5 6.5l-11 11"
        stroke="rgb(var(--study-danger))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InterviewFlow({
  survey,
  slug,
  logoUrl,
  isTest = false,
  testEmail = null,
  source = null,
  interviewLength = null,
  prospect = null,
}: {
  survey: PublicSurvey;
  // The public slug already in this page's URL, passed as its own display
  // prop rather than being added to the PublicSurvey allowlist. Used only to
  // label the respondent's entry on the admin Live page (see
  // lib/presence/study-presence.ts); the interview itself never reads it.
  slug: string;
  logoUrl: string | null;
  // Owner-verified server-side by the page; drives the "Test mode" marker,
  // the is_test flag on the start call (re-verified by the route), and
  // skipping completion persistence so previews are repeatable.
  isTest?: boolean;
  // Overrides the timestamped address test mode would otherwise generate
  // (from ?testEmail=). Already gated on isTest server-side by the page, so
  // it is null on every real run. Ignored entirely when isTest is false.
  testEmail?: string | null;
  // Already sanitized server-side by the page (from ?src=). Never rendered
  // anywhere — just carried through to the start call unchanged, however
  // long the respondent takes to fill in the intro form.
  source?: string | null;
  // The survey's length preset (surveys.interview_length), passed as a
  // dedicated display prop rather than on the PublicSurvey allowlist. It
  // renders the welcome's "About N minutes" line and sizes the progress
  // bar; a benign word, kept off the survey object so that allowlist stays
  // free of internal fields.
  interviewLength?: string | null;
  // Resolved server-side from the [token] segment, null on the generic link.
  // When present the flow opens on the landing beat instead of the welcome
  // screen, and the name/email intake is already answered.
  prospect?: ProspectContext | null;
}) {
  const enabledFields = parseEnabledRespondentFields(survey.custom_fields);
  const customFieldDefs = parseCustomRespondentFieldDefs(survey.custom_fields);
  const lengthPreset = interviewLengthPreset(interviewLength);
  const hasPhone = enabledFields.includes("phone");
  const hasJobTitle = enabledFields.includes("job_title");
  const hasCompany = enabledFields.includes("company");
  const hasLinkedin = enabledFields.includes("linkedin");

  // Opens on the welcome beat; the completion-restore effect below still
  // jumps straight to "complete" for a returning respondent, and tapping the
  // welcome CTA advances to "intro" (the intake fields).
  //
  // Test mode opens on "intro" instead, with no welcome beat and no form: the
  // field state below is already filled in, and the mount effect further down
  // submits it immediately, so "intro" is only ever the in-flight moment
  // between mount and the first question.
  // Test mode skips straight to the auto-start; a prospect opens on their
  // landing beat; everyone else gets the welcome screen. None of the three
  // performs a write on mount (see the start button on the landing beat).
  const [stage, setStage] = useState<Stage>(isTest ? "intro" : prospect ? "prospect" : "welcome");
  // Initializers rather than a later setState, and this matters: the
  // auto-start effect calls startInterview(), which reads these values out of
  // the closure of the render it was created in. Anything written after the
  // first render would not be visible to it.
  // A prospect's name and email come from the record we already hold, so the
  // intake never asks for them. Prefilled into the same state the form would
  // have written, which is what lets startInterview stay one code path.
  const [name, setName] = useState(() =>
    isTest ? TEST_RESPONDENT.name : prospect ? (prospect.fullName ?? "") : "",
  );
  const [email, setEmail] = useState(() =>
    isTest ? testRespondentEmail(testEmail) : prospect ? prospect.email : "",
  );
  // Whether the email field has been blurred (or a submit attempted) —
  // gates the invalid-email X so it never flashes mid-typing.
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState(() => (isTest ? TEST_RESPONDENT.phone : ""));
  // Title and company are the two preset fields the prospect record can also
  // answer, so an invited prospect is not asked to retype what we already
  // know. Everything the record cannot fill (phone, LinkedIn, per-survey
  // custom fields) is still asked — see beginAsProspect.
  const [jobTitle, setJobTitle] = useState(() =>
    isTest ? TEST_RESPONDENT.jobTitle : (prospect?.title ?? ""),
  );
  const [company, setCompany] = useState(() =>
    isTest ? TEST_RESPONDENT.company : (prospect?.companyName ?? ""),
  );
  const [linkedin, setLinkedin] = useState(() => (isTest ? TEST_RESPONDENT.linkedin : ""));
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() =>
    isTest
      ? Object.fromEntries(customFieldDefs.map((field) => [field.key, TEST_RESPONDENT.customField]))
      : {},
  );
  const [responseId, setResponseId] = useState<string | null>(null);
  // Proves to /api/interview/continue and /api/interview/resume that this tab
  // is the one that started this interview, since response_id alone is a
  // guessable UUID, not a credential.
  //
  // The ref is the live copy; a duplicate is also written to sessionStorage
  // (see writeActiveSession) so a reload can rejoin the interview instead of
  // stranding the respondent. That is a real tradeoff, taken deliberately:
  // the token now sits on disk for the life of the tab rather than only in
  // memory, so anything with access to this origin's sessionStorage in this
  // tab can read it. sessionStorage, not localStorage, is what bounds that:
  // it is scoped to this one tab and is discarded when the tab closes, so the
  // token never becomes cross-tab or long-lived ambient state, and it is
  // cleared the moment the interview completes or a resume is refused.
  const sessionTokenRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [closingMessage, setClosingMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  // True for the brief window where the typing dots are fading out before
  // the finished question replaces them (see revealAssistantMessage).
  const [dotsLeaving, setDotsLeaving] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  // Which chip (if any) is currently highlighted/pending auto-submit.
  const [pickedChipIndex, setPickedChipIndex] = useState<number | null>(null);
  // Set the moment the server says the interview is over, a beat before the
  // thank-you screen takes over, so the bar can finish its fill. Covers every
  // way an interview ends: the model's own INTERVIEW_COMPLETE, the server's
  // length wrap-up, and an early close after evasive answers, which all come
  // back as the same complete response.
  const [interviewFinished, setInterviewFinished] = useState(false);
  // Content of the most recent user message that failed to send, or null if
  // nothing's failed / it's since been resolved. The message itself stays in
  // `messages` (it was already appended optimistically) — this only tracks
  // whether that last entry needs a retry, so retry can resend the same
  // content without appending a duplicate.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showResponses, setShowResponses] = useState(false);
  // How many messages a restored session came back with, or null when this
  // tab started the interview normally. The question that was already on
  // screen before the reload must not replay its entrance animation, so the
  // reveal is suppressed for exactly the render where messages.length still
  // equals this. Answering anything grows the transcript past it and normal
  // reveals resume with no cleanup needed.
  const [restoredMessageCount, setRestoredMessageCount] = useState<number | null>(null);
  // Full flyby cutscene while the first question is generated (known-long:
  // the intake POST triggers Claude's opening question). Gated to the intro
  // stage specifically since `loading` is also true later, during ordinary
  // in-chat sends, which get the mini loader instead (see showBirdLoader).
  const showIntroFlyby = useFlybyGate(stage === "intro" && loading, "survey-start");
  // Typing indicator between questions, and on the Retry button after a
  // failed send. Both share the same 300ms "nothing first" gate, so a fast
  // answer shows nothing at all rather than a flash of it. What they render
  // is ThinkingDots (see ./SkyChrome) — the shared BirdLoader is drawn for
  // the eggshell surfaces and disappears on the night sky.
  const showBirdLoader = useLoadingGate(isTyping);
  const showRetryLoader = useLoadingGate(loading && !!failedMessage);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  // The question screen's stage box (see the .study-stage rules in
  // globals.css) — scrolled back to the top when a
  // new question lands so the question, not the middle of the composer, is
  // what the respondent sees.
  const stageRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  // Epoch 0 so a fresh page load with no typing yet never waits.
  const lastKeystrokeAtRef = useRef(0);
  // Intro fields in render order, populated via setFieldRef(idx) below, so
  // Enter-to-advance can focus "whichever field is next" without hardcoding
  // which optional fields this particular survey has enabled.
  const fieldRefs = useRef<Array<HTMLInputElement | null>>([]);
  // Guards the test-mode auto-start against React's double-invoked mount
  // effects in development, which would otherwise open two interviews (and
  // create two response rows) on every preview.
  const autoStartedRef = useRef(false);

  // Live presence for the admin Live page. Additive only: it observes state
  // this component already keeps and changes nothing about the interview.
  // Joined once the chat stage begins (never on the welcome or intake
  // screens) and dropped when the stage leaves "chat", which covers both
  // INTERVIEW_COMPLETE and a mid-interview unmount. Test previews are
  // excluded so an owner checking their own survey does not show up as a
  // respondent.
  useStudyPresence({
    enabled: stage === "chat" && !isTest && responseId !== null,
    surveyId: survey.id,
    slug,
    responseId,
    respondentName: name,
    // Questions asked so far. Derived from the transcript that is already in
    // state, so nothing new needs tracking on this side.
    currentStep: displayedTopicNumber(messages, lengthPreset.topics),
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Test mode ignores stored completion: a real respondent is
    // one-and-done, but the owner needs to preview repeatedly.
    if (isTest) return;
    const stored = window.localStorage.getItem(completionStorageKey(survey.id));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          closingMessage: string;
          messages: InterviewMessage[];
        };
        setClosingMessage(parsed.closingMessage);
        setMessages(parsed.messages);
        setStage("complete");
      } catch {
        // Ignore anything from an older, incompatible storage format.
      }
    }
    // Only ever meant to run once, against whatever's in storage at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Storage can throw (a locked-down browser, a full quota). Losing the
  // ability to resume is a downgrade, never a reason to fail the interview
  // the respondent is actually in, so both sides swallow it.
  function writeActiveSession(id: string, token: string) {
    try {
      window.sessionStorage.setItem(
        activeSessionStorageKey(survey.id),
        serializeActiveSession({ responseId: id, token, surveyId: survey.id }),
      );
    } catch {
      // Resume will simply not be available in this tab.
    }
  }

  function clearActiveSession() {
    try {
      window.sessionStorage.removeItem(activeSessionStorageKey(survey.id));
    } catch {
      // Nothing to do; a stale pointer fails its resume check harmlessly.
    }
  }

  // Rejoins an interview in progress, given its id and session token.
  //
  // Two callers reach it: the mount effect below, for a tab that reloaded
  // and still holds its own pointer, and startInterview, for a prospect
  // whose link resolved to an interview they had already begun elsewhere.
  // The second is why this is a function rather than effect-local code —
  // rejoining an interview has one implementation, and a prospect returning
  // on a new device must land in exactly the state a reload would give them.
  //
  // Throws on any failure so each caller can decide what that means; neither
  // shows the respondent an error about a session they never knew existed.
  async function resumeInterview(id: string, token: string) {
    const res = await fetch("/api/interview/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_id: id, token }),
    });
    if (!res.ok) throw new Error("This interview session could not be resumed");
    const data = await res.json();
    if (!isMountedRef.current) return;

    if (data.complete) {
      clearActiveSession();
      // Match what a live completion writes, so later visits take the
      // normal short-circuit path rather than resuming again. The
      // transcript is not part of a completed resume payload, hence the
      // empty history (the completion screen hides its transcript toggle
      // when there is nothing to show).
      window.localStorage.setItem(
        completionStorageKey(survey.id),
        JSON.stringify({ closingMessage: data.message, messages: [] }),
      );
      setClosingMessage(data.message);
      setStage("complete");
      return;
    }

    const restored = (data.messages ?? []) as InterviewMessage[];
    if (restored.length === 0) throw new Error("Nothing to restore");
    setResponseId(id);
    sessionTokenRef.current = token;
    setMessages(restored);
    setChips(Array.isArray(data.chips) ? data.chips : []);
    setRestoredMessageCount(restored.length);
    setStage("chat");
    // A prospect resuming on a second device has no pointer in this tab yet.
    // Write one, so a reload here behaves like a reload anywhere else.
    if (!isTest) writeActiveSession(id, token);
  }

  // Rejoins an interview this tab already started, after a reload or after
  // the OS discarded the page while the respondent was in another app. The
  // server holds the transcript; the only thing this tab kept is the pointer.
  //
  // Every failure path is silent and ends on the normal welcome screen: a
  // respondent who cannot resume has no idea a session existed, so an error
  // about one would be nonsense to them.
  useEffect(() => {
    // Test mode never writes a pointer (see startInterview), so there is
    // nothing to rejoin; previews stay repeatable.
    if (isTest) return;
    // An interview already recorded as finished short-circuits to the
    // completion screen in the effect above; do not also resume it.
    if (window.localStorage.getItem(completionStorageKey(survey.id))) return;

    let pointer: ReturnType<typeof parseActiveSession> = null;
    try {
      pointer = parseActiveSession(
        window.sessionStorage.getItem(activeSessionStorageKey(survey.id)),
        survey.id,
      );
    } catch {
      return;
    }
    if (!pointer) return;

    let cancelled = false;
    (async () => {
      try {
        await resumeInterview(pointer.responseId, pointer.token);
      } catch {
        if (cancelled) return;
        clearActiveSession();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Mount only, against whatever pointer storage holds at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test mode has no welcome beat and no intake form: the field state above
  // is already what the form would have collected, so the interview starts
  // here, on mount, and the owner's next frame is the first question. This is
  // the ordinary start path with the typing skipped — same startInterview,
  // same payload, same chat UI, same is_test flag (re-verified by the route).
  useEffect(() => {
    if (!isTest || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startInterview();
    // Mount only. startInterview is deliberately not a dependency: it closes
    // over the first render's prefilled field state, which is exactly the
    // state it needs, and re-running this is never correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoFocus lives on the name input, which a prospect never sees, so the
  // remainder-of-the-intake form would otherwise open with nothing focused.
  // Focus whatever field ended up first instead. Guarded on prospect so the
  // anonymous form keeps using its own autoFocus and this never fights it.
  useEffect(() => {
    if (stage !== "intro" || !prospect) return;
    fieldRefs.current[0]?.focus();
  }, [stage, prospect]);

  // Refocus the answer box whenever it becomes usable again (first question,
  // and after each round trip) so respondents never have to click into it.
  useEffect(() => {
    if (stage === "chat" && !loading) {
      answerInputRef.current?.focus();
    }
  }, [stage, loading]);

  // A new question replaces the old one in place, so there's no thread to
  // follow — but with the keyboard up the stage is a scroll box that may be
  // left mid-scroll from the previous answer. Reset it so each question
  // starts at the top of the visible area. Keyed on message count, which
  // changes exactly once per question (see revealAssistantMessage).
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stageRef.current?.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [messages.length]);

  // Long enough for the bar to reach 100%, and nothing under reduced motion,
  // where the width change is instant and there is nothing to wait for.
  async function holdForFinalFill() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    await wait(FINAL_FILL_MS);
  }

  async function waitForRespondentToPauseTyping() {
    while (isMountedRef.current) {
      const idleMs = Date.now() - lastKeystrokeAtRef.current;
      if (idleMs >= TYPING_PAUSE_MS) return;
      await wait(TYPING_PAUSE_MS - idleMs);
    }
  }

  // The typing indicator is already showing by the time this runs (callers
  // turn it on immediately when they send, before the fetch that produces
  // `content` even resolves) — this just holds it up if the respondent is
  // mid-keystroke on a follow-up, then hands off from indicator to question:
  // the dots fade out, and the full question arrives in one motion (per
  // QUESTION_REVEAL).
  async function revealAssistantMessage(
    content: string,
    nextChips: string[] = [],
    topic: number | null = null,
  ) {
    await waitForRespondentToPauseTyping();
    if (!isMountedRef.current) return;

    if (QUESTION_REVEAL !== "none") {
      // Let the dots reach transparent before the swap, so the height
      // change from short indicator to full question block happens while
      // nothing is visible (the question itself starts at opacity 0).
      setDotsLeaving(true);
      await wait(DOTS_FADE_MS);
      if (!isMountedRef.current) return;
    }

    // One batched commit: the dots unmount and the finished question mounts
    // (keyed on messages.length) playing its entrance exactly once. The old
    // word-by-word reveal appended the message *after* streaming into an
    // already-mounted block, which changed the key and remounted it —
    // replaying the entrance over fully-visible text (the end-of-reveal
    // flash). Chips land in the same commit, part of the same arrival.
    setIsTyping(false);
    setDotsLeaving(false);
    setMessages((prev) => [...prev, { role: "assistant", content, ...(topic ? { topic } : {}) }]);
    setLoading(false);
    setChips(nextChips);
  }

  function firstMissingRequiredField(): string | null {
    if (!name.trim()) return "your name";
    if (!email.trim()) return "your work email";
    if (hasPhone && parsePresetFieldRequired(survey.custom_fields, "phone") && !phone.trim()) {
      return parsePresetFieldLabel(survey.custom_fields, "phone");
    }
    if (
      hasJobTitle &&
      parsePresetFieldRequired(survey.custom_fields, "job_title") &&
      !jobTitle.trim()
    ) {
      return parsePresetFieldLabel(survey.custom_fields, "job_title");
    }
    if (
      hasCompany &&
      parsePresetFieldRequired(survey.custom_fields, "company") &&
      !company.trim()
    ) {
      return parsePresetFieldLabel(survey.custom_fields, "company");
    }
    if (
      hasLinkedin &&
      parsePresetFieldRequired(survey.custom_fields, "linkedin") &&
      !linkedin.trim()
    ) {
      return parsePresetFieldLabel(survey.custom_fields, "linkedin");
    }
    for (const field of customFieldDefs) {
      if (field.required && !customFieldValues[field.key]?.trim()) return field.label;
    }
    return null;
  }

  // THE START OF AN INTERVIEW. Reached only from the landing beat's button,
  // never from a render, an effect or a route handler — which is the entire
  // point of that beat. Enterprise mail security (Defender, Proofpoint,
  // Mimecast) fetches every link in a delivered message, so a prospect link
  // that started an interview on load would file a phantom in-progress
  // response for every scanned email, days before the human opened it. A
  // scanner does not click.
  //
  // What the click has to decide is whether the intake still has anything to
  // ask. Name, email, and (where the record has them) title and company are
  // already answered from the prospect row, so a survey that asks for nothing
  // else goes straight into the conversation; a survey that also wants a
  // phone number, a LinkedIn URL or its own custom fields still shows the
  // form, now containing only the parts we could not fill.
  function beginAsProspect() {
    if (firstMissingRequiredField() === null && !hasUnfilledOptionalIntake()) {
      startInterview();
      return;
    }
    setStage("intro");
  }

  // Whether the intake form would still show a field worth asking about.
  // Required fields are covered by firstMissingRequiredField; this is the
  // optional half — an enabled-but-empty field is still worth offering to a
  // prospect, and skipping the form would silently drop it.
  function hasUnfilledOptionalIntake(): boolean {
    if (hasPhone && !phone.trim()) return true;
    if (hasJobTitle && !jobTitle.trim()) return true;
    if (hasCompany && !company.trim()) return true;
    if (hasLinkedin && !linkedin.trim()) return true;
    return customFieldDefs.some((field) => !customFieldValues[field.key]?.trim());
  }

  // Split from the form's onSubmit so Enter-on-the-last-field can trigger it
  // directly without needing to fabricate a submit event.
  async function startInterview() {
    const missing = firstMissingRequiredField();
    if (missing) {
      setError(`Please fill in ${missing}.`);
      return;
    }
    // Both address checks below exist to send the respondent back to the
    // email field to fix it. A prospect has no email field — the address is
    // the one we mailed the invite to — so for them these would be a dead
    // end: an error about a value they cannot edit, on a screen with nothing
    // to correct. The route applies its own rules either way (it is directly
    // callable and never trusts this pass), and it makes the same exception
    // for a verified prospect token.
    if (!prospect) {
      // Same shape check the live tick uses — catches it client-side instead
      // of waiting for the start route to reject the address.
      if (!EMAIL_LIVE_CHECK_PATTERN.test(email.trim())) {
        setEmailTouched(true);
        setError("That doesn't look like a valid email address.");
        return;
      }
      // Same blocklist the start route enforces server-side — this is just
      // the inline, catch-it-before-the-round-trip copy; the route never
      // trusts this check on its own.
      const domain = extractEmailDomain(email.trim());
      if (domain && isFreeEmailDomain(domain)) {
        setEmailTouched(true);
        setError("Please use your work email so we can send your gift card");
        return;
      }
    }
    setError(null);
    setLoading(true);
    setIsTyping(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_id: survey.id,
          ...(isTest ? { is_test: true } : {}),
          ...(source ? { source } : {}),
          // The token, not the prospect id: the route re-resolves it rather
          // than trusting this call to say who the caller is. Sending the id
          // would let anyone file a response as any prospect they could name.
          ...(prospect ? { prospect_token: prospect.token } : {}),
          respondent_name: name,
          respondent_email: email,
          respondent_phone: hasPhone ? phone : undefined,
          custom_field_values: {
            ...(hasJobTitle && jobTitle ? { job_title: jobTitle } : {}),
            ...(hasCompany && company ? { company } : {}),
            ...(hasLinkedin && linkedin ? { linkedin } : {}),
            ...Object.fromEntries(
              customFieldDefs
                .filter((field) => customFieldValues[field.key]?.trim())
                .map((field) => [field.key, customFieldValues[field.key].trim()]),
            ),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start the interview");

      // This prospect already had an interview under way (another device, an
      // earlier click). The route resolved that instead of opening a second
      // one; pick it up where they left it rather than starting over.
      if (data.resume) {
        await resumeInterview(data.response_id, data.token);
        setLoading(false);
        setIsTyping(false);
        return;
      }

      setResponseId(data.response_id);
      sessionTokenRef.current = data.token ?? null;
      // Written once, here, at the moment the chat stage begins: the server
      // owns the transcript from now on, so this tab only needs to remember
      // which interview is its own. Test runs deliberately skip it, matching
      // how they already skip completion persistence.
      if (!isTest && data.response_id && data.token) {
        writeActiveSession(data.response_id, data.token);
      }
      setStage("chat");
      await revealAssistantMessage(
        data.message,
        data.chips ?? [],
        typeof data.topic === "number" ? data.topic : null,
      );
    } catch (err) {
      setIsTyping(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function handleIntroSubmit(e: FormEvent) {
    e.preventDefault();
    startInterview();
  }

  function setFieldRef(idx: number) {
    return (el: HTMLInputElement | null) => {
      fieldRefs.current[idx] = el;
    };
  }

  // Enter in any intro field moves to the next one; on the last field it
  // starts the survey. totalFields is computed fresh per render (see the
  // intro branch below) and closed over here, always consistent with
  // whichever optional fields this survey actually has enabled.
  function handleFieldKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    idx: number,
    totalFields: number,
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (idx < totalFields - 1) {
      fieldRefs.current[idx + 1]?.focus();
    } else {
      startInterview();
    }
  }

  // Shared by a fresh send, a chip auto-submit, and Skip: all end up
  // posting some already-decided message content to the same endpoint and
  // need identical success/failure handling. `content` is a plain argument
  // rather than reading `answer` state, specifically so a chip's auto-submit
  // (fired from a setTimeout) never risks sending a stale value.
  async function sendMessage(content: string, historyForCompletion: InterviewMessage[]) {
    try {
      const res = await fetch("/api/interview/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: responseId,
          message: content,
          token: sessionTokenRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to continue the interview");
      setFailedMessage(null);
      if (data.complete) {
        // The interview is over, so the pointer has nothing left to point at:
        // drop the stored token rather than leaving it readable for the rest
        // of the tab's life.
        clearActiveSession();
        if (!isTest) {
          window.localStorage.setItem(
            completionStorageKey(survey.id),
            JSON.stringify({
              closingMessage: data.message,
              messages: historyForCompletion,
            }),
          );
        }
        setIsTyping(false);
        setInterviewFinished(true);
        await holdForFinalFill();
        if (!isMountedRef.current) return;
        setClosingMessage(data.message);
        setStage("complete");
        setLoading(false);
      } else {
        await revealAssistantMessage(
          data.message,
          data.chips ?? [],
          typeof data.topic === "number" ? data.topic : null,
        );
      }
    } catch (err) {
      // Deliberately not removed from `messages` and not silently dropped:
      // the respondent already saw this answer accepted into the
      // conversation, so it stays there, visually marked, with a way back
      // in rather than vanishing on a flaky connection.
      setIsTyping(false);
      setFailedMessage(content);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function submitAnswerContent(content: string) {
    if (!content.trim() || !responseId || loading) return;
    setError(null);
    // Typing a fresh answer instead of retrying replaces the failed one
    // rather than letting both exist — simpler to reason about than
    // forcing retry-first, and it mirrors editing/resending in any normal
    // chat input. Resolved only here (not on every keystroke) so `messages`
    // — and the `key` the entrance animation below is keyed on — never
    // changes while the respondent is actively typing.
    const baseMessages = failedMessage ? messages.slice(0, -1) : messages;
    setFailedMessage(null);
    setLoading(true);
    setIsTyping(true);
    setPickedChipIndex(null);
    const userMessage: InterviewMessage = { role: "user", content };
    const updatedMessages = [...baseMessages, userMessage];
    setMessages(updatedMessages);
    setAnswer("");
    setChips([]);
    // The keystrokes that just composed this answer shouldn't count as
    // "still typing" against the next reveal's pause check — without this
    // reset, every send looks stalled for a full TYPING_PAUSE_MS because
    // the respondent's last keystroke (finishing their answer) was just
    // now. Only keystrokes typed *after* this point (a follow-up while
    // waiting) should ever trigger that pause.
    lastKeystrokeAtRef.current = 0;
    await sendMessage(content, updatedMessages);
  }

  // What Continue (and Enter) actually sends. A picked chip and typed text
  // can coexist: the chip is the short answer, the text is the elaboration,
  // and the interviewer should see both. Empty when neither is present, which
  // submitAnswerContent treats as nothing to send.
  function composeAnswer(): string {
    const chip = pickedChipIndex !== null ? chips[pickedChipIndex] : null;
    return [chip, answer.trim()].filter(Boolean).join("\n");
  }

  async function submitAnswer() {
    await submitAnswerContent(composeAnswer());
  }

  // Resends the exact content of the last failed message. Doesn't touch
  // `messages` (that entry is already there from the original attempt) and
  // deliberately doesn't set isTyping/show the typing-dots screen — the
  // failed bubble and Retry button stay visible, just disabled via
  // `loading`, so retrying doesn't look like the message vanished again.
  async function retrySend() {
    if (!failedMessage || !responseId || loading) return;
    setError(null);
    setLoading(true);
    await sendMessage(failedMessage, messages);
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    submitAnswer();
  }

  function handleSkip() {
    if (!responseId || loading) return;
    submitAnswerContent(SKIP_MESSAGE_CONTENT);
  }

  // Chips are a single-select toggle: tapping one picks it, tapping the
  // picked one clears it. Nothing is sent until Send (or Enter), and the
  // answer box is left alone so a respondent can add to a chip in their own
  // words.
  function handleChipTap(index: number) {
    setPickedChipIndex((prev) => (prev === index ? null : index));
  }

  // Plain Enter sends (Cmd/Ctrl+Enter falls under the same check, since
  // both are just "Enter" without Shift); Shift+Enter inserts a newline.
  function handleAnswerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  }

  const surveyName = survey.external_title || survey.title;
  // The preset's minutes, and nothing derived from a question count.
  const metaLine = interviewDurationLabel(lengthPreset);
  const rewardPhrase = giftCardPhrase(survey.gift_card_amount, survey.gift_card_brand);
  // The incentive's show/hide flag is the amount itself: a study with no
  // amount set has no reward to promise, and every line that mentions one
  // (the welcome card's row, its pill, the intake's helper text and the
  // thank-you clause) drops together.
  const showReward = survey.gift_card_amount != null;

  // The welcome beat, for both the anonymous link and an invited prospect's.
  //
  // One render, not two near-identical ones: an invited prospect and a cold
  // visitor must not be able to tell they are looking at different screens,
  // and the previous pair of copies had already drifted. What actually
  // differs is the greeting, the respondent-facing description (a prospect
  // was already shown it before this screen existed), and what the button
  // does — so those are the only things branched on.
  //
  // NOTHING ON THIS SCREEN WRITES. No fetch, no route call, no Anthropic
  // call, on mount or on render. It is safe to load as many times as a mail
  // scanner, a preview pane or a curious recipient cares to load it; the
  // interview begins at the button and nowhere else.
  if (stage === "welcome" || (stage === "prospect" && prospect)) {
    const landed = stage === "prospect" && prospect !== null;

    return (
      <>
        <SkyBackdrop />
        <SkyFlock />
        <SkyHeader isTest={isTest} />

        <main className="study-stage relative z-10">
          {/* Two columns past 1100px, where the card has room beside the
              headline; below that the card is dropped entirely rather than
              stacked, per the handoff — it is orientation, and the copy and
              the CTA carry the screen on their own. */}
          <div className="mx-auto grid max-h-full w-full max-w-[1320px] grid-cols-1 items-center gap-[64px] study-wide:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
            <div className="study-fade min-w-0">
              {/* First name alone: the prospect record often has a mangled or
                  all-caps last name from enrichment, and "Hi Jane" is both
                  friendlier and harder to get embarrassingly wrong. A prospect
                  with no first name simply gets no greeting. */}
              {landed && prospect?.firstName && (
                <div className="mb-[14px] text-[17px] font-medium text-study-cream">
                  Hi {prospect.firstName} &#128075;
                </div>
              )}

              <div className="mb-[26px] text-[15px] font-medium uppercase tracking-[0.14em]">
                A short interview &middot; {metaLine}
              </div>

              <h1
                className="m-0 mb-[clamp(14px,2.6vh,30px)] text-balance font-study-serif font-normal leading-[0.94] tracking-[-0.02em]"
                style={{ fontSize: welcomeTitleFontSize(surveyName) }}
              >
                {surveyName}
              </h1>

              {/* RESPONDENT-FACING COPY RULE: never mention or deny sales
                  intent. No "sales", "pitch", "leads", "not a sales call",
                  etc. Also never claim their info is "only" used for X, or
                  make any exclusive-use / "never shared" claim — state true
                  things we WILL do, don't enumerate or limit what else
                  happens. */}
              <p className="text-pretty m-0 mb-[clamp(18px,3.4vh,40px)] max-w-[620px] text-[clamp(17px,2.2vh,22px)] leading-[1.5]">
                {survey.sponsor && (
                  <>
                    Research conducted on behalf of{" "}
                    <strong className="font-semibold">{survey.sponsor}</strong>.{" "}
                  </>
                )}
                Answer in your own words; there are no wrong answers.
              </p>

              {/* Respondent-facing description ONLY — never the internal
                  `topic` field, which names the interview's intent and is not
                  even present on PublicSurvey. Shown on the prospect's landing
                  beat, which is where it has always appeared; there is no
                  fallback when it is unset. */}
              {landed && survey.public_description?.trim() && (
                <p className="text-pretty m-0 mb-[clamp(18px,3.4vh,40px)] max-w-[620px] text-[17px] leading-[1.5]">
                  {survey.public_description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-[16px]">
                <button
                  type="button"
                  onClick={landed ? beginAsProspect : () => setStage("intro")}
                  disabled={landed && loading}
                  // text-[#1f1c18]: the cream fill is the same cream in both
                  // themes, so its label has to be the day ink in both themes
                  // too — text-study-ink would turn cream-on-cream at night.
                  className="study-cta inline-flex touch-manipulation items-center gap-[10px] rounded-[14px] bg-study-cream px-[30px] py-[20px] text-[19px] font-medium text-[#1f1c18] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {/* Same label on both screens. A prospect who already began
                      and came back still sees "Let's get started": the start
                      call picks their conversation up where it left off rather
                      than beginning a second one, so a label promising a fresh
                      start would be the inaccurate one. */}
                  Let&apos;s get started <StudyArrow />
                </button>

                <span className="max-w-[260px] text-[14px] leading-[1.5]">
                  By continuing, you agree to our{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline [text-underline-offset:3px] hover:opacity-80"
                  >
                    Terms
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline [text-underline-offset:3px] hover:opacity-80"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </div>

              {/* A start that fails leaves the respondent on this screen with
                  the button still live, so the error has to say so here —
                  there is no later screen to show it on. */}
              {landed && error && <StudyError className="mt-[18px]">{error}</StudyError>}
            </div>

            <SkyCard
              className="study-fade hidden px-[36px] py-[clamp(20px,3vh,34px)] study-wide:block"
              style={{ "--study-delay": "0.12s" } as React.CSSProperties}
            >
              <InterviewerRow on="card" className="mb-[16px]" />
              <WelcomeCardRow
                heading="A one-on-one interview"
                body="I'll ask about how you work and follow up on what you say."
                divided
              />
              <WelcomeCardRow
                heading={metaLine}
                body={`${lengthPreset.topics} ${lengthPreset.topics === 1 ? "question" : "questions"}. Pick a quick answer or type your own.`}
                divided={showReward}
              />
              {showReward && (
                <div className="flex items-center justify-between gap-[16px]">
                  <WelcomeCardRow
                    heading="A thank-you"
                    body="Sent to your inbox when you finish."
                  />
                  <span className="inline-flex flex-shrink-0 items-center rounded-full border border-study-hair bg-study-chip px-[18px] py-[10px] text-[16px] font-semibold">
                    {rewardPhrase}
                  </span>
                </div>
              )}
            </SkyCard>
          </div>
        </main>

        <StudyFooter />
      </>
    );
  }

  // Intake form. Not one of the handoff's three screens, but it sits between
  // two of them in the same route, so it is built from the same parts: the
  // sky, the header pill, one frosted card holding the fields. The fields,
  // their order, their validation and what is sent are untouched.
  if (stage === "intro") {
    // Test mode reaches this stage only while the auto-started interview is
    // in flight, so there is no form to draw — just the sky, the header and
    // the same flyby a real run shows between Start and the first question.
    if (isTest) {
      return (
        <>
          {showIntroFlyby && <LoadingScreen statusText="Preparing your conversation" />}
          <SkyBackdrop />
          <SkyFlock />
          <SkyHeader isTest={isTest} />
          <main className="study-stage relative z-10 justify-center">
            {/* Nothing here can be retried by hand (there are no fields to
                fix), but a start that fails must still say so rather than
                leaving the owner on an empty sky wondering. */}
            {error && <StudyError>{error}</StudyError>}
          </main>
          <StudyFooter />
        </>
      );
    }

    const nameOk = name.trim().length > 1;
    const emailOk = EMAIL_LIVE_CHECK_PATTERN.test(email.trim());
    const emailShowsX = !emailOk && emailTouched && email.trim().length > 0;

    // A prospect arrives with both of these already answered from their
    // record, so the form does not draw them — and must not count them
    // either: the indices below drive the Enter-advances-field order and the
    // mobile keyboard's next/go hint, and a hidden field left in the sequence
    // would be a dead stop partway through the form.
    const asksIdentity = !prospect;

    let fieldCount = 0;
    const nameIdx = asksIdentity ? fieldCount++ : -1;
    const emailIdx = asksIdentity ? fieldCount++ : -1;
    const phoneIdx = hasPhone ? fieldCount++ : -1;
    const jobTitleIdx = hasJobTitle ? fieldCount++ : -1;
    const companyIdx = hasCompany ? fieldCount++ : -1;
    const linkedinIdx = hasLinkedin ? fieldCount++ : -1;
    const customFieldIdxs = customFieldDefs.map(() => fieldCount++);
    const totalFieldCount = fieldCount;
    const onFieldKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) =>
      handleFieldKeyDown(e, idx, totalFieldCount);
    // Label the mobile keyboard's action key to match what Enter actually
    // does here, so the software keyboard agrees with the existing
    // Enter-advances-field handler instead of offering a generic "return"
    // that looks like it will insert a newline.
    const enterHintFor = (idx: number): "next" | "go" =>
      idx < totalFieldCount - 1 ? "next" : "go";

    return (
      <>
        {showIntroFlyby && <LoadingScreen statusText="Preparing your conversation" />}
        <SkyBackdrop />
        <SkyFlock />
        <SkyHeader isTest={isTest} />

        <main className="study-stage relative z-10">
          <div className="mx-auto w-full max-w-[720px]">
            {survey.sponsor && logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={survey.sponsor}
                className="study-fade mb-[16px] h-8 w-auto object-contain"
              />
            )}

            <h1
              className="study-fade m-0 mb-[clamp(10px,2vh,20px)] text-balance break-words font-study-serif text-[clamp(26px,min(5.4vh,8vw),56px)] font-normal leading-[1.02] tracking-[-0.02em] short:mb-[8px]"
              style={{ "--study-delay": "0.04s" } as React.CSSProperties}
            >
              {surveyName}
            </h1>

            {/* Respondent-facing description ONLY. Never the internal `topic`
                field. When public_description is unset nothing renders here;
                there is no fallback. */}
            {survey.public_description?.trim() && (
              <p
                className="study-fade text-pretty m-0 mb-[clamp(14px,2.4vh,24px)] max-w-[620px] text-[17px] leading-[1.5] short:mb-[12px] short:text-[16px]"
                style={{ "--study-delay": "0.08s" } as React.CSSProperties}
              >
                {survey.public_description}
              </p>
            )}

            <SkyCard
              className="study-intake-card study-fade p-[28px]"
              style={{ "--study-delay": "0.12s" } as React.CSSProperties}
            >
              <form onSubmit={handleIntroSubmit}>
                <div className="study-intake-fields flex flex-col gap-[14px]">
                  {/* Hidden, not disabled-and-shown: a prospect has already
                      told us their name and address, and rendering them greyed
                      out invites "is that right?" on a screen with no way to
                      change it. The values are still in state and still sent —
                      see the prefill in the useState initializers. */}
                  {asksIdentity && (
                    <>
                      <div className="relative flex flex-col gap-[6px]">
                        <label htmlFor="respondent-name" className={FIELD_LABEL_CLASSES}>
                          Your name
                        </label>
                        <input
                          id="respondent-name"
                          ref={setFieldRef(nameIdx)}
                          type="text"
                          autoComplete="name"
                          enterKeyHint={enterHintFor(nameIdx)}
                          autoFocus
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={(e) => onFieldKeyDown(e, nameIdx)}
                          placeholder="First and last"
                          disabled={loading}
                          className={cn(FIELD_INPUT_BASE, "pl-[18px] pr-[44px]")}
                        />
                        {nameOk && <CheckIcon className="absolute bottom-[15px] right-[16px]" />}
                      </div>

                      <div className="relative flex flex-col gap-[6px]">
                        <label htmlFor="respondent-email" className={FIELD_LABEL_CLASSES}>
                          Work email
                        </label>
                        <p className="text-[13px] leading-[1.45] text-study-muted">
                          This is where we&apos;ll send your {rewardPhrase} and a copy of the
                          report.
                        </p>
                        <input
                          id="respondent-email"
                          ref={setFieldRef(emailIdx)}
                          type="email"
                          autoComplete="email"
                          enterKeyHint={enterHintFor(emailIdx)}
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setEmailTouched(true)}
                          onKeyDown={(e) => onFieldKeyDown(e, emailIdx)}
                          placeholder="you@yourcompany.com"
                          disabled={loading}
                          aria-invalid={emailShowsX}
                          className={cn(
                            FIELD_INPUT_BASE,
                            "pl-[18px] pr-[44px]",
                            emailShowsX && "border-study-danger focus:border-study-danger",
                          )}
                        />
                        {emailOk && <CheckIcon className="absolute bottom-[15px] right-[16px]" />}
                        {emailShowsX && <XIcon className="absolute bottom-[15px] right-[16px]" />}
                      </div>
                    </>
                  )}

                  {/* Everything past name and email pairs up two-across from
                      `sm`. These fields are short (a phone number, a job
                      title), the form is the gate to the whole interview, and
                      one field per row put Start below the fold on an ordinary
                      laptop once a study enabled more than a couple of them.
                      DOM order is unchanged, so the Enter-advances-field
                      sequence still runs left to right, top to bottom. */}
                  <div className="grid grid-cols-1 gap-[14px] short:gap-[10px] sm:grid-cols-2">
                    {hasPhone && (
                      <div className="flex min-w-0 flex-col gap-[6px]">
                        <label htmlFor="respondent-phone" className={FIELD_LABEL_CLASSES}>
                          {parsePresetFieldLabel(survey.custom_fields, "phone")}
                        </label>
                        <input
                          id="respondent-phone"
                          ref={setFieldRef(phoneIdx)}
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          enterKeyHint={enterHintFor(phoneIdx)}
                          required={parsePresetFieldRequired(survey.custom_fields, "phone")}
                          value={phone}
                          onChange={(e) => setPhone(formatUsPhone(e.target.value))}
                          onKeyDown={(e) => onFieldKeyDown(e, phoneIdx)}
                          disabled={loading}
                          className={cn(FIELD_INPUT_BASE, "px-[18px]")}
                        />
                      </div>
                    )}

                    {(hasJobTitle || hasCompany) && (
                      <>
                        {hasJobTitle && (
                          <div className="flex min-w-0 flex-col gap-[6px]">
                            <label htmlFor="respondent-job-title" className={FIELD_LABEL_CLASSES}>
                              {parsePresetFieldLabel(survey.custom_fields, "job_title")}
                            </label>
                            <input
                              id="respondent-job-title"
                              ref={setFieldRef(jobTitleIdx)}
                              type="text"
                              autoComplete="organization-title"
                              enterKeyHint={enterHintFor(jobTitleIdx)}
                              required={parsePresetFieldRequired(survey.custom_fields, "job_title")}
                              value={jobTitle}
                              onChange={(e) => setJobTitle(e.target.value)}
                              onKeyDown={(e) => onFieldKeyDown(e, jobTitleIdx)}
                              disabled={loading}
                              className={cn(FIELD_INPUT_BASE, "px-[18px]")}
                            />
                          </div>
                        )}
                        {hasCompany && (
                          <div className="flex min-w-0 flex-col gap-[6px]">
                            <label htmlFor="respondent-company" className={FIELD_LABEL_CLASSES}>
                              {parsePresetFieldLabel(survey.custom_fields, "company")}
                            </label>
                            <input
                              id="respondent-company"
                              ref={setFieldRef(companyIdx)}
                              type="text"
                              autoComplete="organization"
                              enterKeyHint={enterHintFor(companyIdx)}
                              required={parsePresetFieldRequired(survey.custom_fields, "company")}
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              onKeyDown={(e) => onFieldKeyDown(e, companyIdx)}
                              disabled={loading}
                              className={cn(FIELD_INPUT_BASE, "px-[18px]")}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {hasLinkedin && (
                      <div className="flex min-w-0 flex-col gap-[6px]">
                        <label htmlFor="respondent-linkedin" className={FIELD_LABEL_CLASSES}>
                          {parsePresetFieldLabel(survey.custom_fields, "linkedin")}
                        </label>
                        <input
                          id="respondent-linkedin"
                          ref={setFieldRef(linkedinIdx)}
                          type="url"
                          autoComplete="url"
                          inputMode="url"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint={enterHintFor(linkedinIdx)}
                          required={parsePresetFieldRequired(survey.custom_fields, "linkedin")}
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          onKeyDown={(e) => onFieldKeyDown(e, linkedinIdx)}
                          disabled={loading}
                          className={cn(FIELD_INPUT_BASE, "px-[18px]")}
                        />
                      </div>
                    )}

                    {customFieldDefs.map((field, i) => (
                      <div key={field.key} className="flex min-w-0 flex-col gap-[6px]">
                        <label
                          htmlFor={`respondent-custom-${field.key}`}
                          className={FIELD_LABEL_CLASSES}
                        >
                          {field.required ? `${field.label} *` : field.label}
                        </label>
                        <input
                          id={`respondent-custom-${field.key}`}
                          ref={setFieldRef(customFieldIdxs[i])}
                          type="text"
                          enterKeyHint={enterHintFor(customFieldIdxs[i])}
                          required={field.required === true}
                          value={customFieldValues[field.key] ?? ""}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => onFieldKeyDown(e, customFieldIdxs[i])}
                          disabled={loading}
                          className={cn(FIELD_INPUT_BASE, "px-[18px]")}
                        />
                      </div>
                    ))}
                  </div>

                  {error && <StudyError>{error}</StudyError>}
                </div>

                <div className="mt-[20px] flex flex-wrap items-center gap-x-[18px] gap-y-[12px]">
                  <button type="submit" disabled={loading} className={PRIMARY_BUTTON}>
                    {loading ? "Starting…" : "Start"} <StudyArrow />
                  </button>
                  {/* Desktop-only: this hint describes a physical Enter key,
                      so the whole line is hidden on phones rather than leaving
                      an empty box under the button. */}
                  <span className="hidden text-[14px] text-study-muted sm:inline">
                    Press Enter to move between fields
                  </span>
                </div>
              </form>
            </SkyCard>
          </div>
        </main>

        <StudyFooter />
      </>
    );
  }

  // Thank-you screen. One layout, one boolean: the showResponses toggle only
  // mounts/unmounts the transcript below the header row; nothing above it
  // restyles or re-lays-out between states.
  if (stage === "complete") {
    const answerCount = messages.filter((m) => m.role === "user").length;

    return (
      <>
        <SkyBackdrop />
        <SkyFlock />
        <SkyHeader isTest={isTest} />

        <main className="study-stage relative z-10">
          {/* max-h-full on a flex column, so the card below gets only the room
              that is left over and the transcript inside it is the one thing
              on this surface allowed to scroll. */}
          <div
            className="study-thanks mx-auto flex max-h-full min-h-0 w-full max-w-[860px] flex-col"
            data-open={showResponses ? "on" : "off"}
          >
            <div className="study-eyebrow study-fade mb-[clamp(10px,2.4vh,24px)] text-[15px] font-medium uppercase tracking-[0.14em]">
              Interview complete
            </div>

            <h1
              className="study-fade m-0 mb-[clamp(12px,2.4vh,26px)] text-balance font-study-serif text-[clamp(34px,min(8.5vh,10.5vw),96px)] font-normal leading-[0.95] tracking-[-0.02em]"
              style={{ "--study-delay": "0.06s" } as React.CSSProperties}
            >
              That&apos;s everything. Thank you.
            </h1>

            <p
              className="study-fade text-pretty m-0 mb-[clamp(16px,3vh,36px)] max-w-[640px] text-[clamp(17px,2.1vh,21px)] leading-[1.5]"
              style={{ "--study-delay": "0.12s" } as React.CSSProperties}
            >
              {/* The interviewer's own closing line, written for this
                  respondent by the model; the reward clause is ours. */}
              {closingMessage}
              {showReward && (
                <>
                  {" "}
                  Your <span className="font-semibold">{rewardPhrase}</span> will land in your inbox
                  within a day or two.
                </>
              )}
            </p>

            {/* Hidden when there is no transcript to show, which happens when
                this tab resumed straight into an interview that was already
                finished: the resume payload carries the closing line, not the
                conversation. */}
            {messages.length > 0 && (
              <SkyCard
                className="study-fade flex min-h-0 flex-col px-[28px] py-[clamp(16px,2.6vh,24px)]"
                style={{ "--study-delay": "0.18s" } as React.CSSProperties}
              >
                <div className="flex flex-shrink-0 items-center gap-[16px]">
                  <button
                    type="button"
                    onClick={() => setShowResponses((prev) => !prev)}
                    aria-expanded={showResponses}
                    className="flex flex-1 touch-manipulation items-baseline gap-[14px] text-left"
                  >
                    <span className="font-study-serif text-[clamp(24px,3.4vh,32px)] leading-[1.1]">
                      {showResponses ? "Hide your responses" : "See your responses"}
                    </span>
                    <span className="text-[15px] text-study-muted">
                      {answerCount} {answerCount === 1 ? "answer" : "answers"}
                    </span>
                  </button>
                </div>

                {showResponses && (
                  <div className="mt-[18px] flex min-h-0 flex-1 flex-col gap-[12px] overflow-auto border-t border-study-hair pt-[18px]">
                    {messages.map((m, i) => {
                      const isInterviewer = m.role === "assistant";
                      return (
                        <div
                          key={i}
                          className={cn(
                            "study-fade whitespace-pre-wrap break-words px-[18px] py-[12px] text-[16px] leading-[1.55]",
                            isInterviewer
                              ? "max-w-[84%] self-start rounded-[16px_16px_16px_5px] border border-study-hair bg-study-chip"
                              : "max-w-[76%] self-end rounded-[16px_16px_5px_16px] bg-study-ink text-study-chip",
                          )}
                          style={{ "--study-delay": `${0.03 + i * 0.05}s` } as React.CSSProperties}
                        >
                          {/* stripInterviewMarkers is the render boundary: the
                              server already strips the ||ANSWER|| marker and
                              ||CHIPS|| block, but nothing that reaches a
                              respondent's screen relies on that. */}
                          {isInterviewer
                            ? renderEmphasis(stripInterviewMarkers(m.content))
                            : m.content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SkyCard>
            )}
          </div>
        </main>

        <StudyFooter />
      </>
    );
  }

  // Question screen. One column: the interviewer's line, the question as the
  // headline with its key phrase marked, then the frosted answer card holding
  // the chips, the box and the two actions.
  //
  // stripInterviewMarkers is the render boundary: the server already strips
  // the ||ANSWER|| marker and ||CHIPS|| block before this text is stored or
  // sent, but nothing that reaches a respondent's screen relies on that
  // having happened.
  const lastAssistantMessage = stripInterviewMarkers(
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "",
  );
  // How full the bar is. Questions actually asked against the study's promised
  // length; held short of the end until the interview is over.
  const questionsAsked = messages.filter((m) => m.role === "assistant").length;
  const progressPercent = interviewProgressPercent(
    questionsAsked,
    lengthPreset.topics,
    interviewFinished,
  );
  const hasAnswer = pickedChipIndex !== null || answer.trim().length > 0;
  // A restored question was already on screen before the reload, so replaying
  // its entrance would animate in something the respondent has been reading
  // for a while. Suppressed for that first render only; the moment they
  // answer, messages.length moves past the restored count and every
  // subsequent question reveals normally.
  const isRestoredRender =
    restoredMessageCount !== null && messages.length === restoredMessageCount;
  // Staggered entrance, delayed per block (0 / .04 / .08 / .14s), on the
  // handoff's own easing. globals.css gates the animation on
  // prefers-reduced-motion; every element's resting state is its final frame.
  const reveal = (delaySeconds: number): { className?: string; style?: React.CSSProperties } =>
    isRestoredRender
      ? {}
      : {
          className: "study-fade",
          style: { "--study-delay": `${delaySeconds}s` } as React.CSSProperties,
        };

  // The bolded phrase is a hint for the key-phrase mark, not part of the
  // question: extractEmphasis drops it when the model left it standing on its
  // own, splitQuestion then finds the question sentence as before, and
  // emphasisSegments marks the phrase in place only if it is really there.
  const emphasis = extractEmphasis(lastAssistantMessage);
  const { lead, question } = splitQuestion(emphasis.message);
  const segments = emphasisSegments(stripBold(question), emphasis.phrase);

  return (
    <>
      <SkyBackdrop />
      <SkyFlock />
      <SkyHeader isTest={isTest} progressPercent={progressPercent} />

      <main ref={stageRef} className="study-stage relative z-10">
        <div className="mx-auto w-full max-w-[860px]">
          {/* Hidden live regions, always mounted (a live region only fires if
              it exists before its content changes). Two separate regions on
              purpose: the question region's content is derived from
              `messages`, which updates exactly once per question, so each
              question is announced once, in full, regardless of the visual
              entrance. The status region handles transient state (typing, send
              failure); it flips to "" when the question lands, and an empty
              update announces nothing. Politeness is deliberate: no assertive
              interruptions anywhere. */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {stripBold(lastAssistantMessage)}
          </div>
          <div role="status" className="sr-only">
            {isTyping
              ? "The interviewer is typing…"
              : error
                ? `${error}${failedMessage ? " Your answer was not sent. Use the Retry button to send it again." : ""}`
                : ""}
          </div>

          {/* Keyed on messages.length so the staggered entrance replays once
              per new question. The key changes only when a message is
              appended, never mid-animation, so the reveal can't double-fire. */}
          <div key={messages.length} className="flex flex-col">
            <InterviewerRow
              on="sky"
              className={cn("study-drop-short mb-[clamp(10px,2vh,22px)]", reveal(0).className)}
            />

            {isTyping ? (
              // Holds roughly the height the question will take, so the
              // handoff from indicator to question is not a jump.
              <div
                aria-hidden="true"
                className={cn(
                  "flex min-h-[180px] items-center motion-safe:transition-opacity motion-safe:duration-150",
                  dotsLeaving && "opacity-0",
                )}
              >
                {showBirdLoader && <ThinkingDots />}
              </div>
            ) : (
              <>
                {lead && (
                  <p
                    className={cn(
                      "study-drop-short text-pretty m-0 mb-[10px] max-w-[700px] text-[clamp(17px,2.1vh,21px)] leading-[1.5]",
                      reveal(0.04).className,
                    )}
                    style={reveal(0.04).style}
                  >
                    {stripBold(lead)}
                  </p>
                )}

                <h1
                  className={cn(
                    "m-0 mb-[clamp(16px,3vh,36px)] text-balance break-words font-study-serif text-[clamp(28px,min(6.2vh,9vw),62px)] font-normal leading-[1] tracking-[-0.015em]",
                    reveal(0.08).className,
                  )}
                  style={reveal(0.08).style}
                >
                  {segments.map((segment, i) =>
                    segment.bold ? (
                      <strong key={i} className="study-mark">
                        {segment.text}
                      </strong>
                    ) : (
                      segment.text
                    ),
                  )}
                </h1>

                {failedMessage && (
                  <div className="mb-[16px] flex flex-col items-end gap-[8px]">
                    <div className="max-w-[76%] self-end whitespace-pre-wrap break-words rounded-[16px_16px_5px_16px] bg-study-ink px-[18px] py-[12px] text-[16px] leading-[1.55] text-study-chip opacity-60">
                      {failedMessage}
                    </div>
                    <StudyError className="flex items-center gap-[10px]">
                      <span>Failed to send</span>
                      <button
                        type="button"
                        onClick={retrySend}
                        disabled={loading}
                        aria-label="Retry sending your answer"
                        className="font-semibold underline [text-underline-offset:3px] disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:opacity-80"
                      >
                        {loading ? (
                          <span className="inline-flex items-center gap-[8px]">
                            {showRetryLoader && <ThinkingDots label={false} />}
                            Retrying&#8230;
                          </span>
                        ) : (
                          "Retry"
                        )}
                      </button>
                    </StudyError>
                  </div>
                )}

                <form onSubmit={handleSend}>
                  <SkyCard
                    className={cn("study-answer-card p-[20px] sm:p-[28px]", reveal(0.14).className)}
                    style={reveal(0.14).style}
                  >
                    {chips.length > 0 && (
                      <>
                        <div className="study-drop-short mb-[12px] text-[13px] font-medium uppercase tracking-[0.12em] text-study-muted">
                          Pick one, or say it your way
                        </div>
                        {/* Wrap, not horizontal scroll: a scroller hides
                            options off the right edge and its swipe competes
                            with scrolling the stage when the keyboard is up. */}
                        <div className="mb-[14px] flex flex-wrap gap-[10px] sm:mb-[18px]">
                          {chips.map((chip, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleChipTap(i)}
                              disabled={loading}
                              aria-label={`Quick answer: ${chip}`}
                              aria-pressed={pickedChipIndex === i}
                              className="study-chip touch-manipulation break-words rounded-full border border-study-hair bg-study-chip px-[18px] py-[9px] text-left sm:px-[20px] sm:py-[11px] text-[16px] font-medium text-study-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-study-ink focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="relative mb-[14px] sm:mb-[20px]">
                      <textarea
                        ref={answerInputRef}
                        aria-label="Your answer"
                        placeholder={
                          chips.length > 0 ? "…or type it your own way" : "Type your answer"
                        }
                        value={answer}
                        onChange={(e) => {
                          setAnswer(e.target.value);
                          lastKeystrokeAtRef.current = Date.now();
                        }}
                        onKeyDown={handleAnswerKeyDown}
                        rows={2}
                        disabled={loading}
                        enterKeyHint="send"
                        // Two rows, scrolling past that: the handoff's fixed
                        // height is what keeps the whole screen inside 100vh.
                        // 18px also clears iOS Safari's 16px auto-zoom
                        // threshold, as does the 16px the short-viewport rule
                        // drops it to.
                        className="study-answer-box block w-full touch-manipulation resize-none overflow-y-auto rounded-[16px] border border-study-hair bg-study-chip px-[20px] pb-[32px] pt-[16px] text-[18px] leading-[1.55] text-study-ink placeholder:text-study-muted/75 focus:border-study-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {answer.length > 0 && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-[12px] right-[16px] text-[13px] tabular-nums text-study-muted"
                        >
                          {answer.length} chars
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[12px] sm:gap-x-[18px]">
                      <button
                        type="submit"
                        disabled={!hasAnswer || loading}
                        className={PRIMARY_BUTTON}
                      >
                        {/* "Answer to continue" is the disabled label, so the
                            button says why it is not available rather than
                            just looking broken. There is no "Finish" variant:
                            the interviewer decides when the conversation is
                            over (follow-ups are spent as the answers warrant),
                            so this screen genuinely does not know which
                            question is the last one. */}
                        {hasAnswer ? "Continue" : "Answer to continue"} <StudyArrow />
                      </button>

                      {/* Hidden on phones as well as on short windows: the
                          line describes a physical Enter key, and a software
                          keyboard's send key is already labelled by
                          enterKeyHint below. */}
                      <span className="study-drop-short hidden text-[14px] text-study-muted sm:inline">
                        <kbd className="rounded-[6px] border border-study-hair bg-study-chip px-[7px] py-[2px] font-sans text-[13px]">
                          Enter &#8629;
                        </kbd>{" "}
                        to send &middot; Shift+Enter for a new line
                      </span>

                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={loading}
                        className="ml-auto touch-manipulation text-[15px] text-study-muted underline [text-underline-offset:3px] disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:text-study-ink"
                      >
                        Skip this one
                      </button>
                    </div>
                  </SkyCard>
                </form>

                {error && !failedMessage && <StudyError className="mt-[12px]">{error}</StudyError>}
              </>
            )}
          </div>
        </div>
      </main>

      <StudyFooter />
    </>
  );
}
