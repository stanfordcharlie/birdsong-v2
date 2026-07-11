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

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, messages.length]);

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    setError(null);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
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
  );
}
