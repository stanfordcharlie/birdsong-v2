"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";
import {
  parseCustomRespondentFieldDefs,
  parseEnabledRespondentFields,
  parsePresetFieldLabel,
  parsePresetFieldRequired,
  type OptionalRespondentField,
} from "@/lib/surveys/respondent-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { cn } from "@/lib/utils";

type Survey = Database["public"]["Tables"]["surveys"]["Row"];
type Stage = "intro" | "chat" | "complete";

const ASSISTANT_BUBBLE =
  "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-chip px-4 py-2.5 text-sm leading-relaxed text-card-foreground";
const RESPONDENT_BUBBLE =
  "self-end max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function wordRevealDelayMs() {
  return 40 + Math.random() * 20;
}

// If a respondent starts typing a follow-up thought right after sending
// (e.g. they forgot to mention something) before the next question has
// appeared, don't let it pop in over them mid-keystroke: hold it back
// until they've paused typing for this long.
const TYPING_PAUSE_MS = 10000;

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
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
    <div className="fixed inset-x-0 top-0 z-30 h-[3px] bg-chip">
      <div
        className="h-full bg-primary transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
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

function BirdGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M4 17 C4 9, 10 5, 17 5 C17 5, 16 8, 14 9.5 C18 9.5, 21 8, 21 8 C20 15, 14 19, 8 19 L5 22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="7.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function InterviewFlow({
  survey,
  logoUrl,
}: {
  survey: Survey;
  logoUrl: string | null;
}) {
  const enabledFields = parseEnabledRespondentFields(survey.custom_fields);
  const customFieldDefs = parseCustomRespondentFieldDefs(survey.custom_fields);
  // Placeholder text is the only visible label these fields have, so a
  // required one gets a trailing " *" appended to it as the sole visual
  // cue, matching the asterisk convention used elsewhere in the admin UI.
  function fieldPlaceholder(key: OptionalRespondentField): string {
    const label = parsePresetFieldLabel(survey.custom_fields, key);
    return parsePresetFieldRequired(survey.custom_fields, key) ? `${label} *` : label;
  }
  const [stage, setStage] = useState<Stage>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  // Content of the most recent user message that failed to send, or null if
  // nothing's failed / it's since been resolved. The message itself stays in
  // `messages` (it was already appended optimistically) — this only tracks
  // whether that last entry needs a retry, so retry can resend the same
  // content without appending a duplicate.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showResponses, setShowResponses] = useState(false);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const isMountedRef = useRef(true);
  // Epoch 0 so a fresh page load with no typing yet never waits.
  const lastKeystrokeAtRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
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

  // Refocus the answer box whenever it becomes usable again (first question,
  // and after each round trip) so respondents never have to click into it.
  useEffect(() => {
    if (stage === "chat" && !loading) {
      answerInputRef.current?.focus();
    }
  }, [stage, loading]);

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
  // mid-keystroke on a follow-up, then reveals the reply word by word so
  // Claude's side of the conversation paces like a real texting app instead
  // of appearing all at once.
  async function revealAssistantMessage(content: string, nextChips: string[] = []) {
    await waitForRespondentToPauseTyping();
    if (!isMountedRef.current) return;

    setIsTyping(false);
    setStreamingText(null);
    const words = content.split(" ");
    for (let i = 1; i <= words.length; i++) {
      setStreamingText(words.slice(0, i).join(" "));
      if (i < words.length) await wait(wordRevealDelayMs());
      if (!isMountedRef.current) return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content }]);
    setStreamingText(null);
    setLoading(false);
    // Chips land once the question has fully "arrived", not mid-reveal —
    // popping in alongside the finished question reads as part of the
    // conversation instead of a UI element racing the typing animation.
    setChips(nextChips);
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setIsTyping(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_id: survey.id,
          respondent_name: name,
          respondent_email: email,
          respondent_phone: enabledFields.includes("phone") ? phone : undefined,
          custom_field_values: {
            ...(enabledFields.includes("job_title") && jobTitle ? { job_title: jobTitle } : {}),
            ...(enabledFields.includes("company") && company ? { company } : {}),
            ...(enabledFields.includes("linkedin") && linkedin ? { linkedin } : {}),
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

  // Shared by a fresh send and a retry: both end up posting some already-
  // decided message content to the same endpoint and need identical
  // success/failure handling. `historyForCompletion` is whatever `messages`
  // looks like at the call site (it already includes this content — either
  // just-appended for a fresh send, or still there from the original,
  // failed attempt for a retry) so the completion snapshot is correct
  // either way without re-deriving it here.
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
        window.localStorage.setItem(
          completionStorageKey(survey.id),
          JSON.stringify({ closingMessage: data.message, messages: historyForCompletion })
        );
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

  async function submitAnswer() {
    if (!answer.trim() || !responseId || loading) return;
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
    const userMessage: InterviewMessage = { role: "user", content: answer };
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
    await sendMessage(userMessage.content, updatedMessages);
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

  // Tapping a chip drops its text into the composer for editing, it never
  // auto-sends. Chips stay visible after a tap (the respondent might want
  // to try another one, or edit what just got inserted) — they only clear
  // once the respondent actually types (below) or sends.
  function handleChipTap(chipText: string) {
    setAnswer(chipText);
    const el = answerInputRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
    }
  }

  // Cmd/Ctrl+Enter submits; plain Enter (and Shift+Enter) just insert a
  // newline, since answers here can reasonably run to a few sentences.
  function handleAnswerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    }
  }

  const surveyName = survey.external_title || survey.title;

  if (stage === "intro") {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
        <div className="flex flex-col gap-4">
          {survey.sponsor && logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={survey.sponsor} className="h-8 w-auto object-contain" />
          )}
          <h1 className="font-serif text-[28px] font-normal text-card-foreground">{surveyName}</h1>
          {survey.topic && <p className="text-[15px] text-muted-foreground">{survey.topic}</p>}
          {survey.gift_card_amount ? (
            <p className="text-sm text-muted-foreground">
              Complete this interview for a ${survey.gift_card_amount} gift card.
            </p>
          ) : null}
          <form onSubmit={handleStart} className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {enabledFields.includes("phone") && (
              <Input
                type="tel"
                placeholder={fieldPlaceholder("phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required={parsePresetFieldRequired(survey.custom_fields, "phone")}
              />
            )}
            {enabledFields.includes("job_title") && (
              <Input
                type="text"
                placeholder={fieldPlaceholder("job_title")}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required={parsePresetFieldRequired(survey.custom_fields, "job_title")}
              />
            )}
            {enabledFields.includes("company") && (
              <Input
                type="text"
                placeholder={fieldPlaceholder("company")}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required={parsePresetFieldRequired(survey.custom_fields, "company")}
              />
            )}
            {enabledFields.includes("linkedin") && (
              <Input
                type="url"
                placeholder={fieldPlaceholder("linkedin")}
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                required={parsePresetFieldRequired(survey.custom_fields, "linkedin")}
              />
            )}
            {customFieldDefs.map((field) => (
              <Input
                key={field.key}
                type="text"
                placeholder={field.required ? `${field.label} *` : field.label}
                value={customFieldValues[field.key] ?? ""}
                onChange={(e) =>
                  setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                required={field.required === true}
              />
            ))}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Starting..." : "Start"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-10 py-7">
          <div className="flex items-center gap-2.5 text-card-foreground">
            <BirdGlyph />
            <span className="text-sm font-semibold">{surveyName}</span>
          </div>
          <span className="text-[13px] font-medium text-faint">Complete</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-10 pb-24">
          <div className="bs-rise-repeat w-full max-w-[640px] text-center">
            <h1 className="mb-3.5 font-serif text-[38px] font-normal leading-[1.2] text-card-foreground">
              That&apos;s everything. Thank you.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">{closingMessage}</p>

            <button
              type="button"
              onClick={() => setShowResponses((prev) => !prev)}
              className="mx-auto mt-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-card-foreground"
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
  const questionText = streamingText ?? lastAssistantMessage;

  return (
    <div className="flex min-h-screen flex-col">
      <TopProgressLine answered={answeredCount} target={survey.num_questions ?? 8} />

      <div className="flex items-center justify-between px-10 py-7">
        <div className="flex items-center gap-2.5 text-card-foreground">
          <BirdGlyph />
          <span className="text-sm font-semibold">{surveyName}</span>
        </div>
        <span className="text-[13px] font-medium text-faint">Question {answeredCount + 1}</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-10 pb-24 pt-8">
        <div className="w-full max-w-[640px]">
          {isTyping ? (
            <TypingDots />
          ) : (
            <div key={messages.length} className="bs-rise-repeat">
              <div className="mb-[22px] flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-faint">
                <span className="bs-dot inline-block h-[7px] w-[7px] rounded-full bg-indigo-light" />
                Wren is asking
              </div>
              <h1 className="text-pretty mb-8 font-serif text-[34px] font-normal leading-[1.3] text-card-foreground">
                {questionText}
              </h1>

              {failedMessage && (
                <div className="mb-5 flex flex-col items-end gap-1.5">
                  <div className={cn(RESPONDENT_BUBBLE, "opacity-60")}>{failedMessage}</div>
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <span>Failed to send</span>
                    <button
                      type="button"
                      onClick={retrySend}
                      disabled={loading}
                      className="font-semibold underline underline-offset-2 hover:text-destructive/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="flex flex-col gap-5">
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {chips.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleChipTap(chip)}
                        className="rounded-full border border-chip bg-transparent px-3.5 py-2 text-sm text-card-foreground transition-colors hover:bg-chip active:bg-chip/70"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                <Textarea
                  ref={answerInputRef}
                  placeholder="Take your time — plain language is perfect."
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    lastKeystrokeAtRef.current = Date.now();
                    setChips((prev) => (prev.length > 0 ? [] : prev));
                  }}
                  onKeyDown={handleAnswerKeyDown}
                  rows={4}
                  disabled={loading}
                  className="text-base"
                />
                <div className="flex items-center gap-4">
                  <Button type="submit" disabled={loading || !answer.trim()} className="gap-2">
                    Continue
                    <ArrowIcon />
                  </Button>
                  <span className="text-[13px] text-faint">
                    or press <strong className="font-semibold text-muted-foreground">⌘ Enter</strong>
                  </span>
                </div>
              </form>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
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
    <div className="pb-6 text-center">
      <span className="text-xs text-faint">
        Powered by <span className="font-serif text-muted-foreground">Birdsong</span>
      </span>
    </div>
  );
}
