"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";

type Survey = Database["public"]["Tables"]["surveys"]["Row"];
type Stage = "intro" | "chat" | "complete";

export function InterviewFlow({ survey }: { survey: Survey }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [closingMessage, setClosingMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Refocus the answer box whenever it becomes usable again (first question,
  // and after each round trip) so respondents never have to click into it.
  useEffect(() => {
    if (stage === "chat" && !loading) {
      answerInputRef.current?.focus();
    }
  }, [stage, loading]);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start the interview");
      setResponseId(data.response_id);
      setMessages([{ role: "assistant", content: data.message }]);
      setStage("chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !responseId) return;
    setError(null);
    setLoading(true);
    const userMessage: InterviewMessage = { role: "user", content: answer };
    setMessages((prev) => [...prev, userMessage]);
    setAnswer("");
    try {
      const res = await fetch("/api/interview/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: responseId, message: userMessage.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to continue the interview");
      if (data.complete) {
        setClosingMessage(data.message);
        setStage("complete");
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "intro") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">{survey.title}</h1>
        {survey.topic && <p className="text-sm text-neutral-600">{survey.topic}</p>}
        {survey.gift_card_amount ? (
          <p className="text-sm text-neutral-600">
            Complete this interview for a ${survey.gift_card_amount} gift card.
          </p>
        ) : null}
        <form onSubmit={handleStart} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start"}
          </button>
        </form>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Thanks!</h1>
        <p className="text-sm text-neutral-600">{closingMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{survey.title}</h1>
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "rounded bg-neutral-100 px-3 py-2 text-sm text-neutral-900"
                : "self-end rounded bg-black px-3 py-2 text-sm text-white"
            }
          >
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          ref={answerInputRef}
          type="text"
          placeholder="Type your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={loading}
          className="flex-1 rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={loading || !answer.trim()}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
