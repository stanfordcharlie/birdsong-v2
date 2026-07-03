"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OPENING_MESSAGE } from "@/lib/profile-onboarding/prompt";
import type { OnboardingMessage, ResearchResult } from "@/lib/profile-onboarding/types";
import type { ProfileFormValues } from "./ProfileForm";

// Assistant messages mark the key phrase worth skimming with markdown bold
// (**like this**) per the system prompt; render that as real bold instead
// of showing the raw asterisks.
function renderWithBold(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
}

export function ProfileOnboarding({
  onComplete,
}: {
  onComplete: (values: ProfileFormValues, research: ResearchResult | null) => void;
}) {
  const [messages, setMessages] = useState<OnboardingMessage[]>([
    { role: "assistant", content: OPENING_MESSAGE },
  ]);
  const [answer, setAnswer] = useState("");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, messages.length]);

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    setError(null);

    const isFirstAnswer = messages.filter((m) => m.role === "user").length === 0;
    const newMessages: OnboardingMessage[] = [...messages, { role: "user", content: answer }];
    setMessages(newMessages);
    setAnswer("");
    setResearching(isFirstAnswer);
    setLoading(true);

    try {
      const res = await fetch("/api/profile/onboarding/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, research }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const latestResearch: ResearchResult | null = data.research ?? null;
      setResearch(latestResearch);

      if (data.complete) {
        onComplete(
          {
            companyName: data.extracted.companyName,
            whatWeSell: data.extracted.whatWeSell,
            targetIcp: data.extracted.targetIcp,
            valueProp: data.extracted.valueProp,
          },
          latestResearch
        );
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setResearching(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    submitAnswer();
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
            {researching ? "Researching your company..." : "Thinking..."}
          </div>
        )}
      </div>
      <form onSubmit={handleFormSubmit} className="flex gap-2">
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
        <Button type="submit" disabled={loading || !answer.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
