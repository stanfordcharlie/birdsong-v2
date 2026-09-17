"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OPENING_MESSAGE } from "@/lib/brief/prompt";
import type { BriefMessage, ExtractedBrief } from "@/lib/brief/types";
import type { CriticReport } from "@/lib/brief/critic";
import type { StructuredGuide } from "@/lib/surveys/guide";
import { renderWithBold } from "@/lib/chat/render-with-bold";
import { BirdLoader } from "@/components/BirdLoader";

export type BriefResult = {
  brief: ExtractedBrief;
  guide: StructuredGuide;
  report: CriticReport;
  transcript: BriefMessage[];
};

// --- Response reading --------------------------------------------------------
//
// The brief routes answer with JSON on every path they control, including
// failures ({ error, code, requestId }). A body that is not JSON means the
// request never reached the route (a platform error page, a proxy), and a
// fetch that rejects means it never left the browser. Each of those reads
// differently to the person, so they are told apart here rather than all
// collapsing into one sentence.

const NETWORK_FAILURE = "Couldn't reach Birdsong. Check your connection and try again.";

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return null;
  }
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The server's own sentence when it sent one, with its request id; a status-bearing fallback otherwise. */
function failureMessage(res: Response, data: Record<string, unknown> | null, fallback: string): string {
  const serverMessage = typeof data?.error === "string" && data.error.trim() ? data.error.trim() : null;
  const requestId = typeof data?.requestId === "string" && data.requestId ? data.requestId : null;
  const base = serverMessage ?? `${fallback} (HTTP ${res.status}).`;
  return requestId ? `${base} Request ${requestId}.` : base;
}

function isNetworkFailure(err: unknown): boolean {
  // fetch rejects with a TypeError when the request never completed.
  return err instanceof TypeError;
}

/**
 * The brief chat: a short conversational intake that replaces authoring a
 * question guide by hand.
 *
 * Four to seven exchanges, hard capped at ten, and the server decides when
 * it is done by checking the extracted fields rather than waiting for the
 * model to volunteer that it has enough.
 *
 * Layout is the pinned-input pattern: a fixed-height panel, the thread as
 * the only scrolling region inside it, and the composer pinned beneath. The
 * panel owns its height so the conversation growing never grows the page
 * under it and the input never drifts down out of reach. min-h-0 on the
 * thread is load-bearing: a flex child defaults to min-height:auto, refuses
 * to shrink below its content, and would push the composer out of the panel
 * instead of scrolling.
 *
 * It ends by drafting the guide, not by asking whether to. The review step
 * is where the admin decides anything.
 */
export function BriefChat({
  known,
  onGenerated,
}: {
  /**
   * Fields the wizard already collected before the chat opened, chiefly the
   * sponsor. Sent with every turn so the chat never asks for them again.
   */
  known?: Partial<ExtractedBrief>;
  onGenerated: (result: BriefResult) => void;
}) {
  const [messages, setMessages] = useState<BriefMessage[]>([
    { role: "assistant", content: OPENING_MESSAGE },
  ]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Held so a failed draft can be retried without replaying the whole chat.
  const [pendingBrief, setPendingBrief] = useState<ExtractedBrief | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  // Whether the thread was at (or near) the bottom before this render. A ref,
  // not state: it is read inside the scroll effect and must not itself cause
  // a render, or every scroll event would re-run the effect it gates.
  const pinnedToBottomRef = useRef(true);

  useEffect(() => {
    if (!loading && !drafting) inputRef.current?.focus();
  }, [loading, drafting, messages.length]);

  // Autoscroll the THREAD, not the document: scrollIntoView walks every
  // scrollable ancestor and would drag the page up under the panel.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !pinnedToBottomRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [messages, loading, drafting]);

  // 100px of slack, so "scrolled up" means a deliberate move rather than the
  // sub-pixel drift a smooth scroll can leave behind.
  function handleThreadScroll() {
    const el = threadRef.current;
    if (!el) return;
    pinnedToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
  }

  async function draftGuide(brief: ExtractedBrief, transcript: BriefMessage[]) {
    setPendingBrief(brief);
    setDrafting(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/surveys/brief/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
    } catch (err) {
      setError(isNetworkFailure(err) ? NETWORK_FAILURE : "Couldn't draft the guide. Try again.");
      setDrafting(false);
      return;
    }

    const data = await readJson(res);
    if (!res.ok) {
      setError(failureMessage(res, data, "Couldn't draft the guide"));
      setDrafting(false);
      return;
    }
    if (!data || typeof data.guide !== "object" || data.guide === null) {
      setError(failureMessage(res, data, "The guide came back empty"));
      setDrafting(false);
      return;
    }
    onGenerated({
      brief,
      guide: data.guide as StructuredGuide,
      report: data.report as CriticReport,
      transcript,
    });
  }

  async function submitAnswer() {
    if (!answer.trim() || loading || drafting) return;
    setError(null);

    // Sending is an explicit request to see what comes back, so it re-pins
    // even if the reader had scrolled up to re-read something.
    pinnedToBottomRef.current = true;

    const sent = answer;
    const next: BriefMessage[] = [...messages, { role: "user", content: sent }];
    setMessages(next);
    setAnswer("");
    setLoading(true);

    // A turn that did not land is taken back out of the thread and put back
    // in the composer, so the person can send it again (or fix it) without
    // retyping, and the transcript never carries a question nobody answered.
    function restore(message: string) {
      setMessages(messages);
      setAnswer(sent);
      setError(message);
      setLoading(false);
    }

    let res: Response;
    try {
      res = await fetch("/api/surveys/brief/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, known }),
      });
    } catch (err) {
      restore(isNetworkFailure(err) ? NETWORK_FAILURE : "Something went wrong sending that. Try again.");
      return;
    }

    const data = await readJson(res);

    // Case 1: the request failed. The server's sentence and request id when
    // it sent them, the HTTP status when it did not.
    if (!res.ok) {
      restore(failureMessage(res, data, "That message didn't go through"));
      return;
    }

    // Case 3: the brief is complete. The closing line is the assistant's
    // last word, and drafting starts without asking.
    if (data?.complete === true) {
      const closingText =
        typeof data.closing === "string" && data.closing.trim()
          ? data.closing
          : "That's what I need. Drafting the research guide now.";
      const closing: BriefMessage = { role: "assistant", content: closingText };
      const transcript = [...next, closing];
      setMessages(transcript);
      setLoading(false);
      await draftGuide(data.brief as ExtractedBrief, transcript);
      return;
    }

    // Case 2: a 200 with nothing to show. Distinct from a failure: the
    // request worked and the model simply said nothing usable.
    const reply = typeof data?.message === "string" ? data.message.trim() : "";
    if (!reply) {
      restore(failureMessage(res, data, "The model returned no text. Try sending that again"));
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  }

  const composerDisabled = loading || drafting;

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

        {drafting && (
          <div className="flex items-center gap-2.5 rounded-control bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
            <BirdLoader size={18} label={false} />
            Writing the themes and checking every question against the research rules. This takes
            a moment.
          </div>
        )}
      </div>

      {/* Not a <form>: this renders inside the wizard's own markup, and a
          nested <form> is invalid HTML that browsers misparse, so submission
          is wired through onClick/onKeyDown instead. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card p-3">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            placeholder={drafting ? "Drafting the guide..." : "Type your answer..."}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={composerDisabled}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button
            type="button"
            onClick={submitAnswer}
            disabled={composerDisabled || !answer.trim()}
          >
            Send
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-destructive">{error}</p>
            {pendingBrief && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => draftGuide(pendingBrief, messages)}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
