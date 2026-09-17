"use client";

import { useState } from "react";

/**
 * Research subscription, near the foot of a report page.
 *
 * Deliberately not a lead capture: the report above it is already fully
 * readable, nothing here gates anything, there is no modal and no scroll
 * interrupt, and the copy makes no offer beyond what it literally does. It
 * is one field and one button, and a reader who ignores it loses nothing.
 */
export function SubscribeBlock({ sourceSlug }: { sourceSlug: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/research/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourceSlug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <aside className="rounded-2xl border border-landing-border bg-landing-sunk px-8 py-8">
      <h2 className="m-0 font-bricolage text-[22px] font-bold tracking-[-0.012em]">
        Get notified when new research publishes
      </h2>
      <p className="m-0 mt-3 max-w-[52ch] text-[16px] leading-[1.6] text-landing-muted">
        We publish a new study every few weeks. One email when one goes up, nothing else.
      </p>

      {state === "done" ? (
        <p className="m-0 mt-6 text-[16px] font-medium text-landing-green">
          You are on the list. We will email you when the next study publishes.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex max-w-[460px] flex-wrap gap-3">
          <label htmlFor="research-email" className="sr-only">
            Email address
          </label>
          <input
            id="research-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="min-w-[220px] flex-1 rounded-full border-2 border-landing-ink bg-landing-surface px-5 py-3 text-[15.5px] text-landing-ink outline-none placeholder:text-landing-faint focus-visible:ring-2 focus-visible:ring-landing-green"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="lp-hard-cta rounded-full border-2 border-landing-ink bg-landing-ink px-6 py-3 text-[15.5px] font-bold text-landing-bg shadow-[4px_4px_0_var(--lp-ink)] disabled:opacity-60"
          >
            {state === "sending" ? "Adding..." : "Notify me"}
          </button>
        </form>
      )}
      {state === "error" && error && (
        <p className="m-0 mt-3 text-[14.5px] text-landing-muted" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
