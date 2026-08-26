"use client";

import { useEffect, useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/interview/types";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { createClient } from "@/lib/supabase/client";
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
        <span
          aria-hidden
          className={cn(
            "block h-[7px] w-[7px] shrink-0 rounded-full",
            connection === "live" && !completed ? "bs-dot bg-indigo-light" : "bg-chip"
          )}
        />
        <span className="text-sm text-muted-foreground">
          {completed
            ? "This interview has finished. The transcript below is final."
            : connection === "live"
              ? "Watching live. New answers appear as they are given."
              : connection === "error"
                ? "Live connection lost. Reload the page to reconnect."
                : "Connecting"}
        </span>
      </div>

      {/* The bubbles use the respondent interview's own editorial palette
          rather than the admin stone tokens, so what an admin reads here
          looks like what the respondent is looking at. Values copied from
          the interview's transcript view, not imported from it: nothing on
          this page should be able to pull in the interview's input or
          submission logic. The cream ground comes with them, since the
          near-white interviewer bubble has no contrast without it. */}
      <div
        ref={scrollRef}
        className="max-h-[62vh] overflow-y-auto rounded-card border border-[#e9e3d3] bg-[#f3ecdf] p-5 sm:p-7"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-[15px] text-[#6f6757]">
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
                    "whitespace-pre-wrap break-words text-[15.5px] leading-[1.6]",
                    isInterviewer
                      ? "max-w-[86%] self-start rounded-[16px_16px_16px_5px] border border-[#e9e3d3] bg-[#fffefa] px-5 py-3.5 text-[#241f18] shadow-[0_2px_8px_rgba(38,32,25,.05)]"
                      : "max-w-[78%] self-end rounded-[16px_16px_5px_16px] bg-[#3a6046] px-[18px] py-3 text-[#f2f6ef]"
                  )}
                >
                  {isInterviewer ? renderWithBold(message.content) : message.content}
                </div>
              );
            })}

            {!completed && lastRole !== null && (
              <p className="mt-1 self-center text-[12.5px] font-semibold tracking-[0.08em] text-[#a89d88]">
                {lastRole === "assistant" ? "WAITING ON THEIR ANSWER" : "WRITING THE NEXT QUESTION"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
