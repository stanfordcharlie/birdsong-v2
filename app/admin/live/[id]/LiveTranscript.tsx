"use client";

import { useEffect, useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/interview/types";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { createClient } from "@/lib/supabase/client";
import { StatusDot } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

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
      // still holding the anon key would silently receive nothing (RLS
      // rejects it, exactly as it should) and look like a broken feed.
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
            // row being watched. RLS still applies on top: an admin can only
            // receive a row that responses_owner_all already lets them read.
            filter: `id=eq.${responseId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const next = parseMessages(row.messages);
            // Every turn rewrites the whole array, so a change is a
            // replacement rather than an append. A payload that fails to
            // parse leaves the last good transcript on screen instead of
            // blanking it.
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
      <div className="flex items-center gap-2.5">
        <StatusDot live={connection === "live" && !completed} pulse />
        <span className="type-body text-muted-foreground">
          {completed
            ? "This interview has finished. The transcript below is final."
            : connection === "live"
              ? "Watching live. New answers appear as they are given."
              : connection === "error"
                ? "Live connection lost. Reload the page to reconnect."
                : "Connecting"}
        </span>
      </div>

      {/* The bubbles used to copy the respondent interview's editorial palette
          verbatim, so an admin saw roughly what the respondent saw. That
          brought a cream ground with it, which this design pass bans, and an
          admin page painting itself from a second surface's colours is the
          drift the pass exists to remove. The shape of the conversation (the
          asymmetric tails, the left/right split, the accent on the
          respondent's own words) is what carries the resemblance; it now does
          so in admin tokens. */}
      <div
        ref={scrollRef}
        className="max-h-[62vh] overflow-y-auto rounded-card border border-border bg-secondary p-5 sm:p-7"
      >
        {messages.length === 0 ? (
          <p className="type-body py-8 text-center text-muted-foreground">
            No questions yet. The first one appears here as soon as the interview starts.
          </p>
        ) : (
          <div className="mx-auto flex w-full max-w-[600px] flex-col gap-3.5 text-left">
            {messages.map((message, i) => {
              const isInterviewer = message.role === "assistant";
              return (
                <div
                  key={i}
                  className={cn(
                    "type-body whitespace-pre-wrap break-words",
                    isInterviewer
                      ? "max-w-[86%] self-start rounded-card rounded-bl-[5px] border border-border bg-card px-5 py-3.5 shadow-card"
                      : "max-w-[78%] self-end rounded-card rounded-br-[5px] bg-brand px-4 py-3 text-primary-foreground"
                  )}
                >
                  {isInterviewer ? renderWithBold(message.content) : message.content}
                </div>
              );
            })}

            {!completed && lastRole !== null && (
              <p className="type-eyebrow mt-1 self-center text-faint">
                {lastRole === "assistant" ? "WAITING ON THEIR ANSWER" : "WRITING THE NEXT QUESTION"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
