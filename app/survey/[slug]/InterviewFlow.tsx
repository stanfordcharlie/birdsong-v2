"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";
import {
  parseCustomRespondentFieldDefs,
  parseEnabledRespondentFields,
  parsePresetFieldLabel,
  parsePresetFieldRequired,
} from "@/lib/surveys/respondent-fields";
import { extractEmailDomain, isFreeEmailDomain } from "@/lib/interview/work-email";
import { Badge } from "@/components/ui/badge";
import { PerchedBird } from "@/components/marketing/PerchedBird";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { spectral, newsreader, bricolage } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// Design reference: design_handoff_survey_respondent/. Editorial palette
// (matches the marketing pages), deliberately not the admin/shadcn stone
// tokens (bg-primary, border-input, etc. resolve to different hex values
// than this design calls for) — so this file uses raw elements with the
// handoff's exact hex values throughout, the same approach the marketing
// components already take for their own distinct palette.

// The respondent-facing survey shape: an explicit allowlist of the only
// fields this public Client Component is permitted to see. Derived via Pick
// from the full Row so field types stay in sync, but structurally it CANNOT
// name an internal field (topic, question_guide, tone, num_questions,
// target_*, etc.) — referencing survey.topic here is a compile error, which
// is the point. The page (app/survey/[slug]/page.tsx) constructs exactly
// this object; nothing else reaches the browser.
export type PublicSurvey = Pick<
  Database["public"]["Tables"]["surveys"]["Row"],
  "id" | "title" | "external_title" | "sponsor" | "public_description" | "gift_card_amount" | "custom_fields"
>;
type Stage = "welcome" | "intro" | "chat" | "complete";

// Ground is the same eggshell as / (the landing page, #faf8f1, was beige
// #f3ecdf); the warm radial glow stays — it's an alpha wash on top.
const PAGE_BACKGROUND_STYLE: React.CSSProperties = {
  background: "radial-gradient(130% 90% at 50% -8%, rgba(233,166,116,.22), transparent 58%), #faf8f1",
};

const ASSISTANT_BUBBLE =
  "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl border border-[#e7ddc9] bg-[#fffdf7] px-4 py-2.5 text-sm leading-relaxed text-[#262019]";
const RESPONDENT_BUBBLE =
  "self-end max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-[#241f18] px-4 py-2.5 text-sm leading-relaxed text-[#f3ecdf]";

const FIELD_LABEL_CLASSES = "text-[13px] font-semibold text-[#6f6757]";
// text-base (16px) is load-bearing on iOS, not just a type choice: Safari
// auto-zooms the whole page on focus for any input under 16px and never
// zooms back out. min-h-[48px] is the touch-target floor; on desktop the
// py-[14px] + 16px line box already exceeds it, so it changes nothing there.
const FIELD_INPUT_BASE =
  "w-full min-w-0 min-h-[48px] rounded-xl border border-[#e7ddc9] bg-[#fffdf7] py-[14px] text-base text-[#262019] placeholder:text-[#a89d88] focus:border-[#6f6757] focus:outline-none focus:ring-[3px] focus:ring-[rgba(38,32,25,.07)] disabled:cursor-not-allowed disabled:opacity-60";

// Same bird, different perch: 48x46 (vs the marketing default 40x38) and
// its own two-note arrangement, per the handoff.
const INTRO_BIRD_NOTES = [
  { glyph: "♪", top: "-7px", left: "41px", fontSize: "18px", delaySeconds: 0 },
  { glyph: "♫", top: "2px", left: "50px", fontSize: "14px", delaySeconds: 1.1 },
];

// Ship chip auto-submit behind a flag per the handoff ("fallback is today's
// prefill-the-composer behavior") — flip to false to fall back.
const INSTANT_CHIP_SUBMIT = true;
const CHIP_AUTO_SUBMIT_DELAY_MS = 260;

// No skip sentinel exists in the interview prompt/model (out of scope to
// add one here), so Skip sends a plain, natural-reading reply the
// interviewer's existing evasive-answer handling can react to normally.
const SKIP_MESSAGE_CONTENT = "I'd rather not answer that one.";

// Display target for the chat progress bar and "X of Y" counter. The real
// per-survey num_questions is an internal field that must never reach the
// respondent's browser, so the respondent UI shows progress against this
// fixed value instead (computeProgressPercent handles running past it).
const DEFAULT_TARGET_QUESTION_COUNT = 8;

// Rough minutes-per-question used only to render the welcome screen's time
// estimate from the (display-only) questionCount prop. 6 questions -> ~9 min,
// matching the design handoff.
const MINUTES_PER_QUESTION = 1.5;

const EMAIL_LIVE_CHECK_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Below this, a visual-viewport shrink is the URL bar collapsing or a
// find-in-page bar, not a keyboard — re-anchoring the stage for those would
// be a visible jolt for no reason.
const KEYBOARD_MIN_INSET_PX = 120;

// How much of the layout viewport the on-screen keyboard is covering, or 0
// when it's closed.
//
// No CSS unit reports this. dvh shrinks for browser toolbars but *not* for
// the keyboard — on iOS the keyboard is painted over the layout viewport
// without resizing it at all — so the pinned-to-the-bottom composer ends up
// underneath it. window.visualViewport is the only API that describes the
// box the respondent can actually see, hence measuring here and handing the
// number to CSS as a custom property. offsetTop is subtracted because iOS
// scrolls the visual viewport within the layout viewport when focusing a
// field near the bottom; without it the inset reads short by that amount.
function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > KEYBOARD_MIN_INSET_PX ? Math.round(covered) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
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

const QUESTION_REVEAL_CLASS: Record<QuestionReveal, string> = {
  pop: "q-reveal-pop",
  fade: "q-reveal-fade",
  none: "",
};

// How long the typing dots take to fade out before the question lands —
// keep in sync with TypingDots' motion-safe:duration-150.
const DOTS_FADE_MS = 150;

// If a respondent starts typing a follow-up thought right after sending
// (e.g. they forgot to mention something) before the next question has
// appeared, don't let it pop in over them mid-keystroke: hold it back
// until they've paused typing for this long.
const TYPING_PAUSE_MS = 10000;

function TypingDots({ leaving = false }: { leaving?: boolean }) {
  // Purely decorative — the hidden status live region in the chat stage is
  // what tells screen reader users the interviewer is typing. `leaving`
  // fades the dots to transparent just before the question replaces them,
  // so the indicator→question handoff reads as a crossfade instead of a
  // hard cut (instant under reduced motion via motion-safe).
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center gap-1.5 py-2 motion-safe:transition-opacity motion-safe:duration-150",
        leaving && "opacity-0"
      )}
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a89d88] [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a89d88] [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a89d88]" />
    </div>
  );
}

// num_questions is a loose guideline the model is explicitly allowed to run
// longer than, so progress can't just hard-cap at 90% once answered reaches
// target: that plateaus visibly (looks "stuck") for the many surveys that
// run past their nominal question count. Past the guideline, keep creeping
// up with diminishing returns instead of flatlining, and never claim 100%
// short of the interview actually completing.
function computeProgressPercent(answered: number, target: number): number {
  if (answered < target) {
    return Math.round((answered / target) * 90);
  }
  const overage = answered - target;
  return Math.min(90 + Math.round(9 * (overage / (overage + target))), 99);
}

function TopProgressLine({ answered, target }: { answered: number; target: number }) {
  const percent = computeProgressPercent(answered, target);
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-30 h-1 bg-[rgba(38,32,25,.08)]">
      <div
        className="h-full rounded-r-sm bg-[#3a6046] transition-[width] duration-[450ms] ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// Respondents are one-and-done: a survey they've already finished should
// never show the intro form again, whether from revisiting the URL, a hard
// refresh, or (in dev) a Fast Refresh remount. localStorage, not just React
// state, is what makes that stick across a full page reload.
function completionStorageKey(surveyId: string) {
  return `birdsong-survey-complete:${surveyId}`;
}

function TestModeBadge({ isTest }: { isTest: boolean }) {
  if (!isTest) return null;
  return (
    <div className="fixed right-4 top-4 z-20">
      <Badge variant="warning">Test mode</Badge>
    </div>
  );
}

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
    </svg>
  );
}

// The Birdsong mascot as used across the welcome screen
// (design_handoff_survey_welcome). Same 48x44 path as the marketing BirdMark,
// but the welcome renders it at three sizes with different fills (ink body +
// eggshell eye in the cluster; eggshell body on the ink interviewer avatar;
// ink body in the footer), so it's inlined here with explicit fills rather
// than routed through BirdMark's landing-token fills.
function WelcomeBird({
  width,
  height,
  fill,
  eyeFill,
  className,
}: {
  width: number;
  height: number;
  fill: string;
  eyeFill?: string;
  className?: string;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 44" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
        fill={fill}
      />
      {eyeFill && <circle cx="33" cy="25.5" r="1.8" fill={eyeFill} />}
    </svg>
  );
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
        stroke="#3a6046"
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
        stroke="#b3432b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InterviewFlow({
  survey,
  logoUrl,
  isTest = false,
  source = null,
  questionCount = null,
}: {
  survey: PublicSurvey;
  logoUrl: string | null;
  // Owner-verified server-side by the page; drives the "Test mode" marker,
  // the is_test flag on the start call (re-verified by the route), and
  // skipping completion persistence so previews are repeatable.
  isTest?: boolean;
  // Already sanitized server-side by the page (from ?src=). Never rendered
  // anywhere — just carried through to the start call unchanged, however
  // long the respondent takes to fill in the intro form.
  source?: string | null;
  // The survey's planned question count, passed as a dedicated display prop
  // (not on the PublicSurvey allowlist) purely to render the welcome's
  // "N questions · about M minutes" line. It's a benign integer, kept off the
  // survey object so that allowlist stays free of internal fields; the
  // genuinely-sensitive fields never cross to the client either way.
  questionCount?: number | null;
}) {
  const enabledFields = parseEnabledRespondentFields(survey.custom_fields);
  const customFieldDefs = parseCustomRespondentFieldDefs(survey.custom_fields);
  const hasPhone = enabledFields.includes("phone");
  const hasJobTitle = enabledFields.includes("job_title");
  const hasCompany = enabledFields.includes("company");
  const hasLinkedin = enabledFields.includes("linkedin");

  // Opens on the welcome beat; the completion-restore effect below still
  // jumps straight to "complete" for a returning respondent, and tapping the
  // welcome CTA advances to "intro" (the intake fields).
  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Whether the email field has been blurred (or a submit attempted) —
  // gates the invalid-email X so it never flashes mid-typing.
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  // Kept in memory only (never localStorage) — proves to /api/interview/continue
  // that this tab is the one that started this interview, since response_id
  // alone is a guessable UUID, not a credential.
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
  // Content of the most recent user message that failed to send, or null if
  // nothing's failed / it's since been resolved. The message itself stays in
  // `messages` (it was already appended optimistically) — this only tracks
  // whether that last entry needs a retry, so retry can resend the same
  // content without appending a duplicate.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showResponses, setShowResponses] = useState(false);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  // The chat stage's scroll box once the keyboard is up (see the
  // .survey-stage rules in globals.css) — scrolled back to the top when a
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
  // Pending chip auto-submit timer, so a second chip tap, manual typing, or
  // an explicit send/skip can all cancel a still-pending one and avoid a
  // double-send.
  const chipSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (chipSubmitTimeoutRef.current) clearTimeout(chipSubmitTimeoutRef.current);
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

  const keyboardInset = useKeyboardInset();

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

  async function waitForRespondentToPauseTyping() {
    while (isMountedRef.current) {
      const idleMs = Date.now() - lastKeystrokeAtRef.current;
      if (idleMs >= TYPING_PAUSE_MS) return;
      await wait(TYPING_PAUSE_MS - idleMs);
    }
  }

  function clearPendingChipSubmit() {
    if (chipSubmitTimeoutRef.current) {
      clearTimeout(chipSubmitTimeoutRef.current);
      chipSubmitTimeoutRef.current = null;
    }
  }

  // The typing indicator is already showing by the time this runs (callers
  // turn it on immediately when they send, before the fetch that produces
  // `content` even resolves) — this just holds it up if the respondent is
  // mid-keystroke on a follow-up, then hands off from indicator to question:
  // the dots fade out, and the full question arrives in one motion (per
  // QUESTION_REVEAL).
  async function revealAssistantMessage(content: string, nextChips: string[] = []) {
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
    setMessages((prev) => [...prev, { role: "assistant", content }]);
    setLoading(false);
    setChips(nextChips);
  }

  function firstMissingRequiredField(): string | null {
    if (!name.trim()) return "your name";
    if (!email.trim()) return "your work email";
    if (hasPhone && parsePresetFieldRequired(survey.custom_fields, "phone") && !phone.trim()) {
      return parsePresetFieldLabel(survey.custom_fields, "phone");
    }
    if (hasJobTitle && parsePresetFieldRequired(survey.custom_fields, "job_title") && !jobTitle.trim()) {
      return parsePresetFieldLabel(survey.custom_fields, "job_title");
    }
    if (hasCompany && parsePresetFieldRequired(survey.custom_fields, "company") && !company.trim()) {
      return parsePresetFieldLabel(survey.custom_fields, "company");
    }
    if (hasLinkedin && parsePresetFieldRequired(survey.custom_fields, "linkedin") && !linkedin.trim()) {
      return parsePresetFieldLabel(survey.custom_fields, "linkedin");
    }
    for (const field of customFieldDefs) {
      if (field.required && !customFieldValues[field.key]?.trim()) return field.label;
    }
    return null;
  }

  // Split from the form's onSubmit so Enter-on-the-last-field can trigger it
  // directly without needing to fabricate a submit event.
  async function startInterview() {
    const missing = firstMissingRequiredField();
    if (missing) {
      setError(`Please fill in ${missing}.`);
      return;
    }
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
                .map((field) => [field.key, customFieldValues[field.key].trim()])
            ),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start the interview");
      setResponseId(data.response_id);
      sessionTokenRef.current = data.token ?? null;
      setStage("chat");
      await revealAssistantMessage(data.message, data.chips ?? []);
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
  function handleFieldKeyDown(e: KeyboardEvent<HTMLInputElement>, idx: number, totalFields: number) {
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
        if (!isTest) {
          window.localStorage.setItem(
            completionStorageKey(survey.id),
            JSON.stringify({ closingMessage: data.message, messages: historyForCompletion })
          );
        }
        setIsTyping(false);
        setClosingMessage(data.message);
        setStage("complete");
        setLoading(false);
      } else {
        await revealAssistantMessage(data.message, data.chips ?? []);
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
    clearPendingChipSubmit();
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
    // The textarea's height is grown via direct DOM mutation as the
    // respondent types (see onChange below), so clearing the React state
    // alone doesn't shrink it back down; reset it explicitly.
    if (answerInputRef.current) {
      answerInputRef.current.style.height = "auto";
    }
    // The keystrokes that just composed this answer shouldn't count as
    // "still typing" against the next reveal's pause check — without this
    // reset, every send looks stalled for a full TYPING_PAUSE_MS because
    // the respondent's last keystroke (finishing their answer) was just
    // now. Only keystrokes typed *after* this point (a follow-up while
    // waiting) should ever trigger that pause.
    lastKeystrokeAtRef.current = 0;
    await sendMessage(content, updatedMessages);
  }

  async function submitAnswer() {
    await submitAnswerContent(answer);
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
    clearPendingChipSubmit();
    submitAnswerContent(SKIP_MESSAGE_CONTENT);
  }

  // Selecting a chip fills the composer and, unless the fallback flag is
  // off, auto-submits it after a brief flash so the tap itself reads as the
  // answer. Any later chip tap, manual typing, explicit send, or skip
  // cancels a still-pending timer (see clearPendingChipSubmit call sites)
  // so at most one submission for this turn ever goes out.
  function handleChipTap(index: number, chipText: string) {
    clearPendingChipSubmit();
    setAnswer(chipText);
    setPickedChipIndex(index);
    if (!INSTANT_CHIP_SUBMIT) {
      const el = answerInputRef.current;
      if (el) {
        el.focus();
        requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
      }
      return;
    }
    chipSubmitTimeoutRef.current = setTimeout(() => {
      chipSubmitTimeoutRef.current = null;
      submitAnswerContent(chipText);
    }, CHIP_AUTO_SUBMIT_DELAY_MS);
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

  // Welcome screen — the redesign in design_handoff_survey_welcome. Single
  // centered column in Birdsong's editorial brand system: eggshell ground
  // with drifting washes/notes, bird-and-sticker cluster, Bricolage display
  // title, interviewer speech bubble, ink pill CTA, powered-by footer. All
  // exact values (colors, type, spacing, motion) are from the handoff README.
  // Tapping the CTA advances to "intro" (the intake fields), unchanged.
  if (stage === "welcome") {
    const minutes =
      questionCount != null ? Math.max(3, Math.round(questionCount * MINUTES_PER_QUESTION)) : null;
    const metaLine =
      questionCount != null && minutes != null
        ? `${questionCount} question${questionCount === 1 ? "" : "s"} · about ${minutes} minutes`
        : null;

    return (
      <div
        className={cn(
          bricolage.variable,
          "survey-viewport relative flex flex-col overflow-x-hidden font-sans text-[#241f18]"
        )}
        style={{ background: "#faf8f1" }}
      >
        <TestModeBadge isTest={isTest} />

        {/* Decorative ambient layer: two top radial washes, two blurred
            drifting color blobs, three drifting note glyphs. aria-hidden. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            background:
              "radial-gradient(760px 420px at 24% -8%, rgba(58,96,70,.09), transparent 60%), radial-gradient(760px 420px at 76% -10%, rgba(84,116,158,.09), transparent 60%)",
          }}
        >
          <div
            className="sw-blob-a absolute left-[6%] top-[-80px] h-[300px] w-[300px] rounded-full"
            style={{ background: "#e4ecdd", opacity: 0.5, filter: "blur(70px)" }}
          />
          <div
            className="sw-blob-b absolute right-[5%] top-[-60px] h-[280px] w-[280px] rounded-full"
            style={{ background: "#e4ebf4", opacity: 0.55, filter: "blur(70px)" }}
          />
          <span className="sw-bgnote-a absolute left-[14%] top-[14%] text-[20px]" style={{ color: "#3a6046", opacity: 0.4 }}>
            &#9834;
          </span>
          <span className="sw-bgnote-b absolute right-[18%] top-[10%] text-[17px]" style={{ color: "#54749e", opacity: 0.4 }}>
            &#9835;
          </span>
          <span className="sw-bgnote-c absolute right-[9%] top-[64%] text-[15px]" style={{ color: "#a89d88", opacity: 0.45 }}>
            &#9834;
          </span>
        </div>

        <main className="relative flex flex-1 items-center justify-center px-5 pb-10 pt-14 sm:px-8 sm:pb-12 sm:pt-[72px]">
          <div className="flex w-full max-w-[640px] flex-col items-center text-center">
            {/* Bird + sticker cluster (decorative). */}
            <div aria-hidden="true" className="sw-rev relative mb-2.5 h-[76px] w-[180px]">
              <span className="sw-clusternote-a absolute left-[52px] top-0 text-[17px]" style={{ color: "#3a6046", opacity: 0 }}>
                &#9834;
              </span>
              <span className="sw-clusternote-b absolute left-[96px] top-4 text-[14px]" style={{ color: "#a89d88", opacity: 0 }}>
                &#9835;
              </span>
              <WelcomeBird
                width={46}
                height={42}
                fill="#241f18"
                eyeFill="#faf8f1"
                className="sw-bird absolute bottom-0 left-[62px]"
              />
              {survey.gift_card_amount ? (
                <div
                  className="sw-sticker absolute right-[-52px] top-[-16px] h-[98px] w-[98px]"
                  style={{ transform: "rotate(8deg)" }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0"
                    style={{ filter: "drop-shadow(0 4px 10px rgba(38,32,25,.14))" }}
                  >
                    <polygon
                      points="100,50 83.3,63.8 85.4,85.4 63.8,83.3 50,100 36.2,83.3 14.6,85.4 16.7,63.8 0,50 16.7,36.2 14.6,14.6 36.2,16.7 50,0 63.8,16.7 85.4,14.6 83.3,36.2"
                      fill="#f7edcb"
                      stroke="#241f18"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center leading-[1.1] text-[#241f18]">
                    <span className="text-[19px] font-bold italic">${survey.gift_card_amount}</span>
                    <span className="text-[10.5px] font-semibold tracking-[0.02em]">gift card</span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Incentive is visual-only above (the cluster is aria-hidden), so
                announce it once to assistive tech without changing the layout. */}
            {survey.gift_card_amount ? (
              <span className="sr-only">Includes a ${survey.gift_card_amount} gift card.</span>
            ) : null}

            {metaLine && <div className="sw-rev mb-4 text-[15px] font-medium text-[#6f6757]">{metaLine}</div>}

            <h1
              className="sw-rev m-0 mb-3.5 text-balance font-bricolage text-[40px] font-bold leading-[1.05] tracking-[-0.025em] sm:text-[58px]"
              style={{ "--sw-delay": "0.08s" } as React.CSSProperties}
            >
              {surveyName}
            </h1>

            {survey.sponsor && (
              <div
                className="sw-rev mb-9 text-[15px] text-[#6f6757]"
                style={{ "--sw-delay": "0.14s" } as React.CSSProperties}
              >
                Research conducted on behalf of{" "}
                <span className="font-semibold text-[#241f18]">{survey.sponsor}</span>
              </div>
            )}

            <div
              className="sw-rev mb-[38px] flex flex-col items-center gap-2.5"
              style={{ "--sw-delay": "0.22s" } as React.CSSProperties}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#241f18]">
                  <WelcomeBird width={15} height={13} fill="#faf8f1" />
                </span>
                <span className="text-[12.5px] font-semibold tracking-[0.04em] text-[#a89d88]">YOUR INTERVIEWER</span>
              </div>
              <div
                className="text-pretty max-w-[500px] rounded-[18px] border border-[#e9e3d3] bg-[#fffefa] px-[26px] py-4 text-[16.5px] leading-[1.6]"
                style={{ boxShadow: "0 4px 14px rgba(38,32,25,.06)" }}
              >
                This is a short conversation about how you work, not a quiz or a sales call. Answer in
                your own words; there are no wrong answers.
              </div>
            </div>

            <div
              className="sw-rev flex flex-col items-center"
              style={{ "--sw-delay": "0.3s" } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => setStage("intro")}
                className="inline-flex touch-manipulation items-center gap-3 rounded-full bg-[#241f18] px-[30px] py-4 text-[16.5px] font-semibold text-[#faf8f1] [transition:transform_0.25s_ease,box-shadow_0.25s_ease] active:translate-y-0 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[0_14px_30px_rgba(38,32,25,.18)]"
              >
                Let&apos;s get started
                <svg width="20" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true">
                  <path
                    d="M1 6h18m0 0l-4-4.5M19 6l-4 4.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="mt-[18px] text-[13.5px] text-[#a89d88]">
                By continuing, you agree to our{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6f6757] underline [text-underline-offset:3px]"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6f6757] underline [text-underline-offset:3px]"
                >
                  Privacy Policy
                </a>
                .
              </div>
            </div>
          </div>
        </main>

        <footer
          className="sw-rev survey-footer relative flex items-center justify-center gap-2.5 px-8 pb-[34px] pt-[26px]"
          style={{ "--sw-delay": "0.4s" } as React.CSSProperties}
        >
          <span className="text-[13.5px] text-[#a89d88]">Powered by</span>
          <a href="/" className="inline-flex items-center gap-[7px]">
            <WelcomeBird width={17} height={15} fill="#241f18" />
            <span className="font-bricolage text-[15px] font-bold text-[#241f18]">Birdsong</span>
          </a>
        </footer>
      </div>
    );
  }

  if (stage === "intro") {
    const nameOk = name.trim().length > 1;
    const emailOk = EMAIL_LIVE_CHECK_PATTERN.test(email.trim());
    const emailShowsX = !emailOk && emailTouched && email.trim().length > 0;

    let fieldCount = 0;
    const nameIdx = fieldCount++;
    const emailIdx = fieldCount++;
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

    // Split rather than one string so the keyboard hint can be dropped on
    // phones, where there is no Enter key to press — the software keyboard
    // shows "next"/"go" (see enterHintFor) and the instruction reads as
    // stale advice for a keyboard the respondent doesn't have.
    const giftCardMicrocopy = survey.gift_card_amount
      ? "Your info is only used to send the gift card"
      : null;

    return (
      <div
        className={cn(
          spectral.variable,
          newsreader.variable,
          "survey-viewport flex flex-col overflow-x-hidden font-sans text-[16px] text-[#262019]"
        )}
        style={PAGE_BACKGROUND_STYLE}
      >
        <TestModeBadge isTest={isTest} />
        <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-16">
          {survey.sponsor && logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={survey.sponsor} className="survey-intro-rise-1 mb-6 h-8 w-auto object-contain" />
          )}

          {/* Incentive pill and timing meta now live on the welcome beat, so
              they're deliberately gone from here — the intro is the intake
              form, not a second pitch (don't show the pill twice). */}
          <h1 className="survey-intro-rise-2 font-spectral mb-3.5 text-balance break-words text-[31px] font-medium leading-[1.12] tracking-[-0.01em] sm:text-[44px] sm:leading-[1.08]">
            {surveyName}
          </h1>

          {/* Respondent-facing description ONLY. Never the internal `topic`
              field (which names the interview's intent and is not even
              present on PublicSurvey). When public_description is unset,
              nothing renders here; there is no fallback. */}
          {survey.public_description?.trim() && (
            <p className="survey-intro-rise-3 text-pretty mb-7 text-[16px] leading-[1.55] text-[#6f6757] sm:mb-9 sm:text-[17px]">
              {survey.public_description}
            </p>
          )}

          <form onSubmit={handleIntroSubmit}>
            <div className="survey-intro-rise-4 flex flex-col gap-3">
              <div className="relative flex flex-col gap-1.5">
                {/* The notes are absolutely placed up to ~64px right of the
                    bird's own left edge, so at 360–430px the default
                    right-[14px] perch pushes them against (and past) the
                    form's right edge. Sliding the whole bird inboard on
                    phones keeps the arrangement intact rather than clipping
                    it; sm: restores the desktop perch exactly. */}
                <PerchedBird
                  className="pointer-events-none absolute -top-[14px] right-[58px] z-[2] sm:right-[14px]"
                  width={48}
                  height={46}
                  notes={INTRO_BIRD_NOTES}
                />
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
                  className={cn(FIELD_INPUT_BASE, "pl-4 pr-11")}
                />
                {nameOk && <CheckIcon className="absolute bottom-4 right-[15px]" />}
              </div>

              <div className="relative flex flex-col gap-1.5">
                <label htmlFor="respondent-email" className={FIELD_LABEL_CLASSES}>
                  Work email
                </label>
                <p className="text-[13px] text-[#a89d88]">
                  This is where we&apos;ll send your gift card and a copy of the report.
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
                    "pl-4 pr-11",
                    emailShowsX && "border-[#b3432b] focus:border-[#b3432b]"
                  )}
                />
                {emailOk && <CheckIcon className="absolute bottom-4 right-[15px]" />}
                {emailShowsX && <XIcon className="absolute bottom-4 right-[15px]" />}
              </div>

              {hasPhone && (
                <div className="flex flex-col gap-1.5">
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
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => onFieldKeyDown(e, phoneIdx)}
                    disabled={loading}
                    className={cn(FIELD_INPUT_BASE, "px-4")}
                  />
                </div>
              )}

              {(hasJobTitle || hasCompany) && (
                <div
                  className={
                    hasJobTitle && hasCompany
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
                      : "flex flex-col gap-3"
                  }
                >
                  {hasJobTitle && (
                    <div className="flex min-w-0 flex-col gap-1.5">
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
                        className={cn(FIELD_INPUT_BASE, "px-4")}
                      />
                    </div>
                  )}
                  {hasCompany && (
                    <div className="flex min-w-0 flex-col gap-1.5">
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
                        className={cn(FIELD_INPUT_BASE, "px-4")}
                      />
                    </div>
                  )}
                </div>
              )}

              {hasLinkedin && (
                <div className="flex flex-col gap-1.5">
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
                    className={cn(FIELD_INPUT_BASE, "px-4")}
                  />
                </div>
              )}

              {customFieldDefs.map((field, i) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label htmlFor={`respondent-custom-${field.key}`} className={FIELD_LABEL_CLASSES}>
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
                      setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    onKeyDown={(e) => onFieldKeyDown(e, customFieldIdxs[i])}
                    disabled={loading}
                    className={cn(FIELD_INPUT_BASE, "px-4")}
                  />
                </div>
              ))}

              {error && <p className="text-sm text-[#b3432b]">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="survey-intro-rise-5 mt-6 flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2.5 rounded-xl bg-[#241f18] px-6 text-[17px] font-semibold text-[#f3ecdf] transition-opacity active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:hover)]:hover:opacity-90"
            >
              {loading ? "Starting…" : "Start"}
              <ArrowIcon size={17} />
            </button>
          </form>

          <div className="survey-intro-rise-6 mt-3.5 text-balance text-center text-[13px] text-[#a89d88]">
            <span className="hidden sm:inline">Press Enter to move between fields</span>
            {giftCardMicrocopy && <span className="hidden sm:inline"> · </span>}
            {giftCardMicrocopy}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div
        className={cn(
          spectral.variable,
          "survey-viewport flex flex-col overflow-x-hidden font-sans text-[16px] text-[#262019]"
        )}
        style={PAGE_BACKGROUND_STYLE}
      >
        <TestModeBadge isTest={isTest} />
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center sm:px-6 sm:py-16">
          <div className="bs-rise-repeat mx-auto w-full max-w-[560px]">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#e4ecdd]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="#3a6046"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="font-spectral mb-3.5 text-balance text-[29px] font-medium leading-[1.18] sm:text-[38px] sm:leading-[1.15]">
              That&apos;s everything. Thank you.
            </h1>
            <p className="text-pretty break-words text-base leading-[1.6] text-[#6f6757]">
              {closingMessage}
              {survey.gift_card_amount ? (
                <>
                  {" "}
                  The{" "}
                  <strong className="font-semibold text-[#262019]">
                    ${survey.gift_card_amount} gift card
                  </strong>{" "}
                  will land in your inbox within a day or two.
                </>
              ) : null}
            </p>

            <button
              type="button"
              onClick={() => setShowResponses((prev) => !prev)}
              className="mx-auto mt-8 flex min-h-[44px] touch-manipulation items-center gap-1.5 px-3 text-sm text-[#6f6757] transition-colors [@media(hover:hover)]:hover:text-[#262019]"
              aria-expanded={showResponses}
            >
              {showResponses ? "Hide your responses" : "See your responses"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={cn("transition-transform", showResponses ? "rotate-180" : "")}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showResponses && (
              <div className="mx-auto mt-4 flex max-w-md flex-col gap-3 text-left">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "assistant" ? ASSISTANT_BUBBLE : RESPONDENT_BUBBLE}>
                    {m.role === "assistant" ? renderWithBold(m.content) : m.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const answeredCount = messages.filter((m) => m.role === "user").length;
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const questionText = lastAssistantMessage;
  // Drives only the progress bar and the "X of Y" counter, both of which are
  // deliberately loose. The real per-survey num_questions is an internal
  // field that must not reach the browser, so this is a fixed display target,
  // not the actual planned count (computeProgressPercent already handles the
  // interview running past it).
  const targetQuestionCount = DEFAULT_TARGET_QUESTION_COUNT;
  const hasAnswer = answer.trim().length > 0;
  // Same auto-grow heuristic as the design reference: line count plus a
  // rough characters-per-line estimate, not actual DOM measurement.
  const draftRows = Math.min(6, Math.max(2, answer.split("\n").length + Math.floor(answer.length / 70)));

  return (
    <div
      className={cn(
        spectral.variable,
        "survey-viewport flex flex-col overflow-x-hidden font-sans text-[16px] text-[#262019]"
      )}
      data-keyboard={keyboardInset > 0 ? "open" : undefined}
      style={
        {
          ...PAGE_BACKGROUND_STYLE,
          "--kb-inset": `${keyboardInset}px`,
        } as React.CSSProperties
      }
    >
      <TopProgressLine answered={answeredCount} target={targetQuestionCount} />
      <TestModeBadge isTest={isTest} />

      <div
        ref={stageRef}
        className="survey-stage flex flex-1 items-center justify-center px-5 py-8 sm:px-6 sm:py-16"
      >
        <div className="w-full max-w-[640px]">
          {/* Hidden live regions, always mounted (a live region only fires
              if it exists before its content changes). Two separate regions
              on purpose: the question region's content is derived from
              `messages`, which updates exactly once per question — when the
              finished question is appended in revealAssistantMessage — so
              each question is announced once, in full, regardless of the
              visual entrance animation. The status region handles transient
              state (typing, send failure); it flips to "" when the question
              lands, and an empty update announces nothing. Politeness is
              deliberate — no assertive interruptions anywhere. */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {lastAssistantMessage.replace(/\*\*/g, "")}
          </div>
          <div role="status" className="sr-only">
            {isTyping
              ? "The interviewer is typing…"
              : error
                ? `${error}${failedMessage ? " Your answer was not sent. Use the Retry button to send it again." : ""}`
                : ""}
          </div>

          {isTyping ? (
            <TypingDots leaving={dotsLeaving} />
          ) : (
            // Keyed on messages.length so the entrance replays once per new
            // question — the key changes only when a message is appended,
            // never mid-animation, so the reveal can't double-fire.
            <div key={messages.length} className={QUESTION_REVEAL_CLASS[QUESTION_REVEAL]}>
              <div className="mb-1 flex items-center justify-end">
                <span className="text-[13px] tabular-nums text-[#a89d88]">
                  {answeredCount + 1} of {targetQuestionCount}
                </span>
              </div>

              {/* 32px is a lot of vertical run for a long question on a
                  380px-tall visible box — at phone widths it alone can push
                  the composer off screen. Scaling to 23px buys back roughly
                  a line and a half without touching the desktop size. The
                  bolded-phrase underline treatment is unchanged; only
                  underline-offset tightens with the smaller type. */}
              <h1 className="font-spectral text-pretty mb-5 break-words text-[23px] font-medium leading-[1.32] tracking-[-0.005em] [&_strong]:font-semibold [&_strong]:not-italic [&_strong]:underline [&_strong]:decoration-[#3a6046] [&_strong]:decoration-2 [&_strong]:underline-offset-[4px] sm:mb-[26px] sm:text-[32px] sm:leading-[1.28] sm:[&_strong]:underline-offset-[5px]">
                {renderWithBold(questionText)}
              </h1>

              {failedMessage && (
                <div className="mb-5 flex flex-col items-end gap-1.5">
                  <div className={cn(RESPONDENT_BUBBLE, "opacity-60")}>{failedMessage}</div>
                  <div className="flex items-center gap-2 text-xs text-[#b3432b]">
                    <span>Failed to send</span>
                    <button
                      type="button"
                      onClick={retrySend}
                      disabled={loading}
                      aria-label="Retry sending your answer"
                      className="inline-flex min-h-[44px] touch-manipulation items-center px-2 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a6046] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:opacity-80"
                    >
                      {loading ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="flex flex-col gap-[18px]">
                {chips.length > 0 && (
                  // Wrap, not horizontal scroll: a scroller hides options
                  // off the right edge (the respondent has to discover them)
                  // and its swipe gesture competes with scrolling the stage
                  // when the keyboard is up. Wrapping keeps every suggestion
                  // visible and thumb-reachable; the cost is vertical space,
                  // which the smaller mobile question type just bought back.
                  <div className="flex flex-wrap gap-2.5">
                    {chips.map((chip, i) => {
                      const picked = pickedChipIndex === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleChipTap(i, chip)}
                          aria-label={`Suggested reply: ${chip}`}
                          aria-pressed={picked}
                          className={cn(
                            "min-h-[44px] touch-manipulation break-words rounded-full border px-[18px] py-[11px] text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a6046] focus-visible:ring-offset-2",
                            picked
                              ? "border-[#241f18] bg-[#241f18] text-[#f3ecdf]"
                              : "border-[#e7ddc9] bg-[#fffdf7] text-[#262019] active:scale-[.97] [@media(hover:hover)]:hover:border-[#a89d88] [@media(hover:hover)]:hover:bg-[#f6efe1]"
                          )}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                )}

                <textarea
                  ref={answerInputRef}
                  aria-label="Your answer"
                  placeholder="…or type it your own way"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    lastKeystrokeAtRef.current = Date.now();
                    setChips((prev) => (prev.length > 0 ? [] : prev));
                    setPickedChipIndex(null);
                    clearPendingChipSubmit();
                  }}
                  onKeyDown={handleAnswerKeyDown}
                  rows={draftRows}
                  disabled={loading}
                  enterKeyHint="send"
                  // max-h caps the auto-grow at ~4 of its 6 rows on phones and
                  // scrolls past that: a 6-row box plus the keyboard leaves
                  // no room for the question or Continue on a 380px-tall
                  // visible area. sm:max-h-none keeps the full 6-row growth
                  // on desktop.
                  className="max-h-[136px] w-full touch-manipulation resize-none overflow-y-auto rounded-[14px] border border-[#e7ddc9] bg-[#fffdf7] px-[18px] py-4 text-base leading-[1.5] text-[#262019] placeholder:text-[#a89d88] focus:border-[#6f6757] focus:outline-none focus:ring-[3px] focus:ring-[rgba(38,32,25,.07)] disabled:cursor-not-allowed disabled:opacity-60 sm:max-h-none"
                />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    type="submit"
                    disabled={!hasAnswer || loading}
                    className="flex min-h-[48px] touch-manipulation items-center gap-2.5 rounded-xl bg-[#241f18] px-[26px] py-[14px] text-base font-semibold text-[#f3ecdf] transition-opacity active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45 [@media(hover:hover)]:hover:opacity-90"
                  >
                    Continue <ArrowIcon size={15} />
                  </button>
                  {/* Describes physical keys the phone keyboard doesn't have;
                      enterKeyHint="send" on the textarea is the mobile
                      equivalent affordance. */}
                  <span className="hidden text-[13px] text-[#a89d88] sm:inline">
                    Enter ↵ to send · Shift+Enter for a new line
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-control px-3 text-sm text-[#a89d88] transition-colors disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:text-[#262019]"
                  >
                    Skip
                  </button>
                </div>
              </form>
              {error && <p className="mt-3 text-sm text-[#b3432b]">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    // Bottom-most element in every stage, so it owns clearing the iPhone
    // home indicator for the whole flow. When the keyboard is up this is
    // hidden (globals.css) and the clearance goes with it — correct, since
    // the keyboard is covering that strip anyway.
    <div className="survey-footer pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-center">
      <span className="text-xs text-[#a89d88]">
        Powered by <span className="font-serif text-[#6f6757]">Birdsong</span>
      </span>
    </div>
  );
}
