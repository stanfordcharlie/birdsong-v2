"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";
import {
  parseEnabledRespondentFields,
  OPTIONAL_RESPONDENT_FIELD_LABELS,
} from "@/lib/surveys/respondent-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { cn } from "@/lib/utils";

type Survey = Database["public"]["Tables"]["surveys"]["Row"];
type Stage = "intro" | "chat" | "complete";

// Light "received message" treatment (matches the profile-onboarding chat)
// instead of a solid dark bubble, so bolded phrases read clearly and the
// two sides of the conversation are easy to tell apart at a glance.
const ASSISTANT_BUBBLE =
  "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-secondary px-4 py-2.5 text-sm leading-relaxed text-secondary-foreground";
const RESPONDENT_BUBBLE =
  "self-end max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Mimics natural reply pacing: a short "reading + thinking" pause that scales
// gently with reply length, jittered so it doesn't feel like a fixed timer.
function typingDelayMs(replyLength: number) {
  const base = 600 + Math.random() * 300;
  const perChar = 15 + Math.random() * 5;
  const jitter = Math.random() * 400 - 200;
  return Math.min(Math.max(base + replyLength * perChar + jitter, 500), 2800);
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
    <div className={cn(ASSISTANT_BUBBLE, "flex w-fit items-center gap-1 py-3")}>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
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

// Rendered as a hairline at the very top of the viewport rather than a
// labeled form-wizard bar, since a respondent mid-conversation doesn't need
// (or want) a percentage readout.
function TopProgressLine({ answered, target }: { answered: number; target: number }) {
  const percent = computeProgressPercent(answered, target);
  return (
    <div className="fixed inset-x-0 top-0 z-30 h-0.5">
      <div
        className="h-full bg-primary transition-all duration-500"
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

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

export function InterviewFlow({ survey }: { survey: Survey }) {
  const enabledFields = parseEnabledRespondentFields(survey.custom_fields);
  const [stage, setStage] = useState<Stage>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [closingMessage, setClosingMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping, streamingText]);

  async function waitForRespondentToPauseTyping() {
    while (isMountedRef.current) {
      const idleMs = Date.now() - lastKeystrokeAtRef.current;
      if (idleMs >= TYPING_PAUSE_MS) return;
      await wait(TYPING_PAUSE_MS - idleMs);
    }
  }

  // Shows a typing indicator, then reveals the reply word by word, so
  // Claude's side of the conversation paces like a real texting app instead
  // of appearing all at once.
  async function revealAssistantMessage(content: string) {
    await waitForRespondentToPauseTyping();
    if (!isMountedRef.current) return;

    setIsTyping(true);
    setStreamingText(null);
    await wait(typingDelayMs(content.length));
    if (!isMountedRef.current) return;

    setIsTyping(false);
    const words = content.split(" ");
    for (let i = 1; i <= words.length; i++) {
      setStreamingText(words.slice(0, i).join(" "));
      if (i < words.length) await wait(wordRevealDelayMs());
      if (!isMountedRef.current) return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content }]);
    setStreamingText(null);
    setLoading(false);
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
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
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start the interview");
      setResponseId(data.response_id);
      setStage("chat");
      await revealAssistantMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || !responseId || loading) return;
    setError(null);
    setLoading(true);
    const userMessage: InterviewMessage = { role: "user", content: answer };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setAnswer("");
    // The textarea's height is grown via direct DOM mutation as the
    // respondent types (see onChange below), so clearing the React state
    // alone doesn't shrink it back down; reset it explicitly.
    if (answerInputRef.current) {
      answerInputRef.current.style.height = "auto";
    }
    try {
      const res = await fetch("/api/interview/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: responseId, message: userMessage.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to continue the interview");
      if (data.complete) {
        window.localStorage.setItem(
          completionStorageKey(survey.id),
          JSON.stringify({ closingMessage: data.message, messages: updatedMessages })
        );
        setClosingMessage(data.message);
        setStage("complete");
        setLoading(false);
      } else {
        await revealAssistantMessage(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    submitAnswer();
  }

  // Enter sends the answer; Shift+Enter falls through to the textarea's
  // default behavior and inserts a newline instead.
  function handleAnswerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  }

  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <h1 className="text-xl font-semibold text-card-foreground">
              {survey.external_title || survey.title}
            </h1>
            {survey.topic && <p className="text-sm text-muted-foreground">{survey.topic}</p>}
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
                  placeholder={OPTIONAL_RESPONDENT_FIELD_LABELS.phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
              {enabledFields.includes("job_title") && (
                <Input
                  type="text"
                  placeholder={OPTIONAL_RESPONDENT_FIELD_LABELS.job_title}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              )}
              {enabledFields.includes("company") && (
                <Input
                  type="text"
                  placeholder={OPTIONAL_RESPONDENT_FIELD_LABELS.company}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Starting..." : "Start"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold text-card-foreground">Thanks!</h1>
          <p className="text-sm text-muted-foreground">{closingMessage}</p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your responses
          </h2>
          {messages.map((m, i) => (
            <div key={i} className={m.role === "assistant" ? ASSISTANT_BUBBLE : RESPONDENT_BUBBLE}>
              {m.role === "assistant" ? renderWithBold(m.content) : m.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const answeredCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex min-h-screen flex-col">
      <TopProgressLine answered={answeredCount} target={survey.num_questions ?? 8} />

      <header className="sticky top-0 z-20 bg-page/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-2xl px-6 pb-3 pt-8">
          <h1 className="text-sm font-medium text-muted-foreground">
            {survey.external_title || survey.title}
          </h1>
        </div>
      </header>

      {/* pb-28 clears the sticky composer below: without it the last
          message/bottomRef lands right at the viewport edge and ends up
          hidden behind the composer instead of scrolled fully into view. */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-2 pb-28">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "assistant" ? ASSISTANT_BUBBLE : RESPONDENT_BUBBLE}>
            {m.role === "assistant" ? renderWithBold(m.content) : m.content}
          </div>
        ))}
        {isTyping && <TypingDots />}
        {streamingText !== null && (
          <div className={ASSISTANT_BUBBLE}>{renderWithBold(streamingText)}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 z-20 bg-page">
        <div className="mx-auto w-full max-w-2xl px-6 pb-6 pt-3">
          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 rounded-3xl bg-card px-2 py-2 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-ring"
          >
            <Textarea
              ref={answerInputRef}
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                lastKeystrokeAtRef.current = Date.now();
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onKeyDown={handleAnswerKeyDown}
              rows={1}
              className="max-h-36 flex-1 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="submit"
              disabled={loading || !answer.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-foreground text-card transition-opacity disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
