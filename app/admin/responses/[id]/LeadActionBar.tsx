"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FloatingBar, FloatingBarButton } from "@/components/admin/ui";
import { bg, border, dot, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

// The lead page's floating bar: copy the call script, push to HubSpot.
//
// The push is the manual retry for the sync that already runs by itself when
// an interview completes. That automatic run is fire-and-forget on a path
// that must never block the respondent: when it fails, its only trace is a
// server log, and this button is how a rep recovers from that.
//
// Safe to press repeatedly. The route matches the contact by email and
// updates it, so a second push refreshes the record rather than creating a
// second one; a deal is only opened if the lead scores high enough.
//
// What happened is said in a line directly above the bar. A failure stays
// until the next attempt or until it is dismissed; a success clears itself.

type Notice = { tone: "ok" | "failed"; message: string };

const NOTICE_MS = 4000;

export function LeadActionBar({
  responseId,
  scriptText,
  canPush,
  disabledReason,
}: {
  responseId: string;
  /** The call script as plain text. Empty when there is no script. */
  scriptText: string;
  canPush: boolean;
  /** Set when the response cannot be pushed at all (test run, unfinished). */
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  function show(next: Notice) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(next);
    if (next.tone === "ok") {
      noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context).
      show({ tone: "failed", message: "Could not copy. The script is on the Call script tab." });
    }
  }

  async function handlePush() {
    setNotice(null);
    setPushing(true);
    try {
      const res = await fetch(`/api/responses/${responseId}/hubspot-sync`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string; reason?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || data?.reason || `HubSpot returned ${res.status}`);
      }
      show({ tone: "ok", message: "Pushed to HubSpot" });
      // The push wrote to the activity trail and may have advanced the lead
      // (lib/hubspot-sync.ts); the page re-reads both.
      router.refresh();
    } catch (err) {
      show({
        tone: "failed",
        message: `HubSpot push failed: ${err instanceof Error ? err.message : "Something went wrong."}`,
      });
    } finally {
      setPushing(false);
    }
  }

  const hasScript = scriptText.trim().length > 0;
  if (!hasScript && !canPush) return null;

  return (
    <div className="pointer-events-none fixed bottom-[28px] left-[var(--ds-shell-sidebar)] right-0 z-30 flex flex-col items-center gap-2 px-8">
      {notice && (
        <div
          role={notice.tone === "failed" ? "alert" : "status"}
          className={cn(
            "ds-small pointer-events-auto flex max-w-[560px] items-start gap-2 border px-3 py-2",
            radius.control,
            border.base,
            bg.base,
            text.ink
          )}
        >
          <span
            aria-hidden
            className={cn(
              "mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full",
              notice.tone === "failed" ? dot.danger : dot.accent
            )}
          />
          <span className="min-w-0 break-words">{notice.message}</span>
          {notice.tone === "failed" && (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              className={cn("focus-ring shrink-0 px-1 leading-[1.45]", radius.chip, text.muted2)}
            >
              ×
            </button>
          )}
        </div>
      )}

      <FloatingBar className="static">
        {hasScript && (
          <FloatingBarButton onClick={handleCopy}>{copied ? "Copied" : "Copy call script"}</FloatingBarButton>
        )}
        {canPush && (
          <FloatingBarButton
            primary
            title={disabledReason ?? undefined}
            disabled={pushing || Boolean(disabledReason)}
            onClick={handlePush}
          >
            {pushing ? "Pushing" : "Push to HubSpot"}
          </FloatingBarButton>
        )}
      </FloatingBar>
    </div>
  );
}
