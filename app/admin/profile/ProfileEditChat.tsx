"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import type { ProfileFormValues } from "./ProfileForm";

type EditMessage = { role: "user" | "assistant"; content: string };

export function ProfileEditChat({
  currentValues,
  onUpdate,
}: {
  currentValues: ProfileFormValues;
  onUpdate: (values: ProfileFormValues) => void;
}) {
  const [messages, setMessages] = useState<EditMessage[]>([]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Each edit applies on top of whatever the admin's form currently shows
  // (including their own direct typing, or a prior edit), so the latest
  // values are read from a ref rather than closing over a stale prop.
  const currentValuesRef = useRef(currentValues);
  currentValuesRef.current = currentValues;

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function submitInstruction() {
    if (!instruction.trim() || loading) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: instruction }]);
    const sentInstruction = instruction;
    setInstruction("");
    setLoading(true);

    try {
      const res = await fetch("/api/profile/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: sentInstruction,
          current: currentValuesRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      onUpdate(data.updated);
      setMessages((prev) => [...prev, { role: "assistant", content: data.confirmation }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitInstruction();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-control border border-border bg-secondary/40 p-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Edit with AI
        </h3>
        <p className="text-xs text-muted-foreground">
          Tell it what to change, e.g. &ldquo;update our value prop to mention the new AI
          feature.&rdquo;
        </p>
      </div>

      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "assistant"
                  ? "whitespace-pre-wrap break-words rounded-control bg-card px-3 py-2 text-sm text-card-foreground"
                  : "self-end whitespace-pre-wrap break-words rounded-control bg-primary px-3 py-2 text-sm text-primary-foreground"
              }
            >
              {m.role === "assistant" ? renderWithBold(m.content) : m.content}
            </div>
          ))}
          {loading && (
            <div className="rounded-control bg-card px-3 py-2 text-sm text-muted-foreground">
              Updating...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          ref={inputRef}
          placeholder="What would you like to change?"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={2}
          className="flex-1 resize-none bg-card"
        />
        <Button type="button" onClick={submitInstruction} disabled={loading || !instruction.trim()}>
          Send
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
