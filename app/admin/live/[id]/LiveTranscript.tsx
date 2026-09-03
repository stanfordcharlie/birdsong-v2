"use client";

import { useEffect, useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/interview/types";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { createClient } from "@/lib/supabase/client";
import { StatusDot } from "@/components/admin/ui";

// Read-only. There is no composer, no send path, and no write of any kind on
// this page: it subscribes to the response row and renders whatever the
// interview has already persisted. The interview itself neither knows nor
// cares that anyone is watching.

type ConnectionState = "connecting" | "live" | "error";

// The row's messages column is Json, and it arrives here straight off a
// Realtime payload rather than through the typed query builder, so it is
// validated instead of cast.
function parseMessages(value: unknown): InterviewMessage[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: InterviewMessage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const message = entry as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      return null;
    }
    parsed.push({ role: message.role, content: message.content });
  }
  return parsed;
}

function statusLabel(completed: boolean, connection: ConnectionState): string {
  if (completed) return "Finished";
  if (connection === "live") return "Live";
  if (connection === "error") return "Connection lost. Reload to reconnect.";
  return "Connecting";
}

export function LiveTranscript({
  responseId,
  initialMessages,
  initialCompleted,
}: {
  responseId: string;
  initialMessages: InterviewMessage[];
  initialCompleted: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [completed, setCompleted] = useState(initialCompleted);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      // Realtime evaluates RLS with whatever token the socket was opened
      // with, so the admin's access token has to be on it before the
      // subscription starts. supabase-js normally does this off the auth
      // state change, but that can land after this effect runs, and a socket
      // still holding the anon key would silently receive nothing.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`live-response:${responseId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "responses",
            // Server-side filter, so this socket only ever carries the one
            // row being watched. RLS still applies on top.
            filter: `id=eq.${responseId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const next = parseMessages(row.messages);
            // Every turn rewrites the whole array, so a change is a
            // replacement rather than an append. A payload that fails to
            // parse leaves the last good transcript on screen.
            if (next) setMessages(next);
            if (typeof row.completed === "boolean") setCompleted(row.completed);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setConnection("live");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnection("error");
          }
        });
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [responseId]);

  // Same shape as the interview's own scroll reset (an effect keyed on the
  // message count, honoring prefers-reduced-motion), pointed at the bottom
  // of the thread rather than the top of a single question.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [messages.length]);

  const lastRole = messages.length > 0 ? messages[messages.length - 1].role : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <StatusDot live={connection === "live" && !completed} pulse />
        <span className="type-meta">{statusLabel(completed, connection)}</span>
      </div>

      {/* A transcript, not a chat mock-up: no filled ground, no bubbles. A
          left hairline rule frames the thread and each turn is a label and
          its text. */}
      <div ref={scrollRef} className="admin-measure max-h-[62vh] overflow-y-auto border-l border-border pl-4">
        {messages.length === 0 ? (
          <p className="type-body text-muted-foreground">No questions yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, i) => {
              const isInterviewer = message.role === "assistant";
              return (
                <div key={i} className="flex flex-col gap-1">
                  <span className="type-eyebrow">{isInterviewer ? "Interviewer" : "Respondent"}</span>
                  <p className="type-body whitespace-pre-wrap break-words">
                    {isInterviewer ? renderWithBold(message.content) : message.content}
                  </p>
                </div>
              );
            })}

            {!completed && lastRole !== null && (
              <p className="type-meta">
                {lastRole === "assistant" ? "Waiting for their answer" : "Writing the next question"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
