"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OPENING_MESSAGE } from "@/lib/survey-onboarding/prompt";
import type { ExtractedSurveyDetails, SurveyOnboardingMessage } from "@/lib/survey-onboarding/types";
import { renderWithBold } from "@/lib/chat/render-with-bold";

export function SurveyOnboardingChat({
  onComplete,
}: {
  onComplete: (values: ExtractedSurveyDetails) => void;
}) {
  const [messages, setMessages] = useState<SurveyOnboardingMessage[]>([
    { role: "assistant", content: OPENING_MESSAGE },
  ]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  // Whether the thread was at (or near) the bottom before this render. A ref,
  // not state: it is read inside the scroll effect and must not itself cause
  // a render, or every scroll event would re-run the effect it gates.
  const pinnedToBottomRef = useRef(true);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, messages.length]);

  // Autoscroll the THREAD, not the document. This used to call
  // bottomRef.scrollIntoView(), which walks every scrollable ancestor and so
  // moved the window as well as the panel: the wizard card was dragged up
  // under the viewport, which is what cut the first message off mid-line and
  // pushed the composer past the fold. scrollTo on the container itself
  // cannot touch the page.
  //
  // Gated on pinnedToBottomRef so a reader who has deliberately scrolled back
  // is not yanked to the bottom when the next message lands.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !pinnedToBottomRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [messages, loading]);

  // 100px of slack, so "scrolled up" means a deliberate move rather than the
  // sub-pixel drift a smooth scroll can leave behind.
  function handleThreadScroll() {
    const el = threadRef.current;
    if (!el) return;
    pinnedToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
  }

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    setError(null);

    // Sending is an explicit request to see what comes back, so it re-pins
    // even if the reader had scrolled up to re-read something.
    pinnedToBottomRef.current = true;

    const newMessages: SurveyOnboardingMessage[] = [...messages, { role: "user", content: answer }];
    setMessages(newMessages);
    setAnswer("");
    setLoading(true);

    try {
      const res = await fetch("/api/surveys/onboarding/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (data.complete) {
        onComplete(data.extracted);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  }

  // Fixed-height flex column. The panel owns its height, the thread is the
  // only scrolling region inside it, and the composer is pinned beneath.
  //
  // The height is fixed rather than max-h on the thread because the panel
  // previously grew with the conversation, which grew the page under it. Now
  // the page height is constant and all growth happens inside the thread.
  //
  // min-h-0 on the thread is load-bearing: a flex child defaults to
  // min-height:auto, refuses to shrink below its content, and pushes the
  // composer out of the panel instead of scrolling. It is the difference
  // between a scrollback you can reach and one clipped past the edge.
  return (
    <div className="flex h-[min(56vh,560px)] min-h-[320px] flex-col overflow-hidden rounded-control border border-border">
      <div
        ref={threadRef}
        onScroll={handleThreadScroll}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "whitespace-pre-wrap break-words rounded-control bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                : "self-end whitespace-pre-wrap break-words rounded-control bg-primary px-3 py-2 text-sm text-primary-foreground"
            }
          >
            {m.role === "assistant" ? renderWithBold(m.content) : m.content}
          </div>
        ))}
        {loading && (
          <div className="rounded-control bg-secondary px-3 py-2 text-sm text-muted-foreground">
            Thinking...
          </div>
        )}
      </div>
      {/* Not a <form>: this whole chat renders inside SurveyForm's own outer
          <form>, and nested <form> elements are invalid HTML that browsers
          will misparse, so submission is wired up via onClick/onKeyDown
          directly instead. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card p-3">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            placeholder="Type your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button type="button" onClick={submitAnswer} disabled={loading || !answer.trim()}>
            Send
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
