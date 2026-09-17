"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/marketing/green/MaterialIcon";

/**
 * Research subscription, at the foot of a report.
 *
 * Deliberately not a lead capture: the report above it is already fully
 * readable, nothing here gates anything, there is no modal and no scroll
 * interrupt, and the copy makes no offer beyond what it literally does.
 *
 * Posts to the same /api/research/subscribe endpoint the previous design's
 * block used, with the same payload — this is a reskin of that form, not a
 * second subscription path.
 */
export function NotifyBlock({ sourceSlug }: { sourceSlug: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
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
    <section className="relative overflow-hidden border-[2.5px] border-ln-ink bg-ln-green px-[28px] py-[40px] text-white shadow-[10px_10px_0_var(--ln-sage)] sm:px-[48px] sm:py-[56px]">
      <div
        aria-hidden="true"
        className="absolute -right-[50px] -top-[70px] size-[200px] rounded-full border-[56px] border-ln-green-mid opacity-70"
      />
      <div className="relative max-w-[560px]">
        <h2 className="m-0 mb-[14px] font-jakarta text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
          Get notified when new research publishes.
        </h2>
        <p className="m-0 mb-[28px] text-[18px] leading-[1.5] opacity-95">
          We publish a new study every few weeks. One email when one goes up, nothing else.
        </p>

        {state === "done" ? (
          <p className="m-0 inline-flex items-center gap-[12px] rounded-full bg-ln-logo-cream px-[24px] py-[14px] font-jakarta text-[17px] font-semibold text-ln-ink">
            <MaterialIcon name="check" className="text-[22px]" />
            You&rsquo;re on the list.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-wrap gap-[12px]">
            <label htmlFor="notify-email" className="sr-only">
              Email address
            </label>
            <input
              id="notify-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="min-w-[220px] flex-1 rounded-full border-2 border-ln-ink bg-white px-[22px] py-[16px] font-dmsans text-[17px] text-ln-ink outline-none focus:border-ln-logo-cream focus:ring-[3px] focus:ring-ln-logo-cream/40"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="cursor-pointer rounded-full border-2 border-ln-ink bg-ln-logo-cream px-[30px] py-[16px] font-jakarta text-[17px] font-bold text-ln-ink transition-colors hover:bg-white disabled:opacity-70"
            >
              {state === "sending" ? "Sending…" : "Notify me"}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="m-0 mt-[14px] text-[16px] text-ln-logo-cream">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
