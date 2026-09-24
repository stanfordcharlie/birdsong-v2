"use client";

import { useId, useState } from "react";
import { isPairedPoint, type CallScript } from "@/lib/interview/call-script";
import { CopyScriptButton } from "./CopyScriptButton";

// The call script, drawn as the one filled block on the page: the opening
// line a rep says first, in the display face, on the accent ground. It is
// the thing the whole page exists to hand over, which is why it is the one
// region allowed a fill (DESIGN.md, decisions log). The talking points that
// justify the line sit under "Why this works", closed by default.

export function OpeningLineCard({ script, scriptText }: { script: CallScript; scriptText: string }) {
  const [open, setOpen] = useState(false);
  const pointsId = useId();
  const points = script.talkingPoints;
  const quoteCount = points.filter(isPairedPoint).length;

  return (
    <section className="rounded-card bg-brand p-6 text-primary-foreground">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="type-eyebrow text-primary-foreground/70">Opening line</h2>
        <CopyScriptButton
          text={scriptText}
          variant="secondary"
          className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
        />
      </div>

      {script.opener && (
        <p className="font-serif text-[28px] leading-[1.35] tracking-[-0.01em]">
          &ldquo;{script.opener}&rdquo;
        </p>
      )}

      {points.length > 0 && (
        <div className={script.opener ? "mt-4" : undefined}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={pointsId}
            onClick={() => setOpen((previous) => !previous)}
            className="focus-ring rounded-control font-archivo text-[14px] font-medium text-primary-foreground/80 underline-offset-2 hover:text-primary-foreground hover:underline"
          >
            {open ? "Hide" : "Why this works"}
            {quoteCount > 0 && ` (${quoteCount} ${quoteCount === 1 ? "quote" : "quotes"})`}
          </button>

          {open && (
            <ul id={pointsId} className="mt-4 flex flex-col">
              {points.map((point, i) => (
                <li
                  key={i}
                  className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-primary-foreground/15 py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-2"
                >
                  {/* The respondent's words on the left, the rep's move on
                      the right. Legacy points have no quote and take the
                      whole row. */}
                  {isPairedPoint(point) && (
                    <p className="type-body border-l border-primary-foreground/30 pl-3 italic text-primary-foreground/80">
                      {point.said}
                    </p>
                  )}
                  <p className={isPairedPoint(point) ? "type-body text-primary-foreground" : "type-body text-primary-foreground sm:col-span-2"}>
                    {point.angle}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
