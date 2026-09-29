"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bg, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

// The worth-a-call card: the one ink ground on Home. A ring of worth a call
// over completed, the week's figures beside it, and the way into the
// unworked queue.

export type WorthACallData = {
  /** Completed in the last seven days and scored at or above the threshold. */
  worth: number;
  /** Completed in the last seven days. The ring's denominator. */
  completed: number;
  /** Of those, the ones a rep has marked contacted. */
  contacted: number;
  /** Of those, the ones with a meeting booked. */
  meeting: number;
  /** The Leads queue's Unworked count: what the button leads to. */
  unworked: number;
};

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function durationMs(element: Element | null, property: string, fallback: number): number {
  if (!element) return fallback;
  const raw = getComputedStyle(element).getPropertyValue(property).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.endsWith("ms") ? value : value * 1000;
}

// Every figure on the card counts up together, once, over
// --ds-duration-count. The server render and the reduced-motion render are
// both the final numbers: progress starts at 1 and only a browser that
// allows motion ever winds it back to 0.
function useCountProgress(ref: React.RefObject<HTMLElement>, delayMs: number): number {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = durationMs(ref.current, "--ds-duration-count", 900);
    const startAt = performance.now() + delayMs;
    let frame = 0;
    setProgress(0);
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / duration));
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ref, delayMs]);

  return progress;
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className={cn("font-mono text-[14px] tabular-nums", text.onInk)}>{value}</span> {label}
    </span>
  );
}

export function WorthACallCard({ data, enterDelayMs }: { data: WorthACallData; enterDelayMs: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const progress = useCountProgress(ref, enterDelayMs);
  const count = (value: number) => Math.round(value * progress);

  const ratio = data.completed > 0 ? Math.min(1, data.worth / data.completed) : 0;

  return (
    <Link
      ref={ref}
      href="/admin/leads?tab=unworked"
      className={cn(
        "ds-enter focus-ring flex flex-wrap items-center gap-7 px-8 py-7",
        radius.hero,
        bg.ink,
        text.onInk
      )}
      style={{ "--ds-enter-delay": `${enterDelayMs}ms` } as React.CSSProperties}
    >
      <span className="relative block h-[136px] w-[136px] shrink-0">
        <svg width="136" height="136" viewBox="0 0 104 104" aria-hidden>
          <circle
            cx="52"
            cy="52"
            r={RING_RADIUS}
            fill="none"
            stroke="hsl(var(--ds-ink-2))"
            strokeWidth="10"
          />
          {/* No arc at zero: a round cap on an empty dash still paints a dot. */}
          {ratio > 0 && (
            <circle
              className="ds-ring-draw"
              cx="52"
              cy="52"
              r={RING_RADIUS}
              fill="none"
              stroke="hsl(var(--ds-accent-bright))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - ratio)}
              transform="rotate(-90 52 52)"
              style={
                {
                  "--ds-ring-length": RING_LENGTH,
                  "--ds-enter-delay": `${enterDelayMs}ms`,
                } as React.CSSProperties
              }
            />
          )}
        </svg>
        <span className="ds-mono-hero absolute inset-0 flex items-center justify-center tabular-nums">
          {count(data.worth)}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <span className="ds-h2">worth a call</span>
        <span className={cn("text-[14px] leading-[1.5]", text.onInkMuted)}>
          of <span className="font-mono tabular-nums">{data.completed}</span>{" "}
          {data.completed === 1 ? "interview" : "interviews"} this week.
          {data.unworked > 0 && (
            <>
              {" "}
              <span className="font-mono tabular-nums">{data.unworked}</span> nobody has touched yet.
            </>
          )}
        </span>
        <span className={cn("mt-1 flex flex-wrap gap-x-[18px] gap-y-1 text-[12px]", text.onInkMuted)}>
          <Figure value={count(data.completed)} label="completed" />
          <Figure value={count(data.contacted)} label="contacted" />
          <Figure value={count(data.meeting)} label="meeting" />
        </span>
        {data.unworked > 0 && (
          <span
            className={cn(
              "mt-1.5 inline-flex h-[36px] items-center gap-[0.35em] px-[14px] text-[13px] font-extrabold",
              radius.control,
              bg.accentBright,
              text.ink
            )}
          >
            Triage the <span className="font-mono font-medium tabular-nums">{data.unworked}</span>
          </span>
        )}
      </span>
    </Link>
  );
}
