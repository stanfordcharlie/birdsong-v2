"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Find / Talk / Route — the three-column recap that closes out the shared sky.
 *
 * A single hairline across the top and nothing between the columns: the grid
 * gap and the 32px right padding on each cell do the separating. Each cell
 * pads only on its right and top, so the first column's text stays flush with
 * the section's left edge and the rule above it starts at the same x.
 *
 * `auto-fit, minmax(260px, 1fr)` rather than a breakpoint — three columns on a
 * desktop, two on a tablet, one on a phone, with no cutoff to keep in sync
 * with the rest of the page.
 *
 * Transparent, like the hero and the conversation section above it: all three
 * sit on SkyBand's single gradient, which has reached flat cream by the time
 * it gets down here.
 *
 * v4 added the scroll reveal. The three columns rise 32px and fade in, 0.18s
 * apart, when the section is 85% of the way up the viewport. An
 * IntersectionObserver rather than a scroll listener — it fires once, off the
 * main thread, and the `once` disconnect means there is nothing bound after
 * the reveal has happened.
 *
 * Reduced motion resolves to visible immediately, and so does a browser with
 * no IntersectionObserver: `shown` starts false only when there is something
 * that can set it to true. Content that is invisible until an observer fires
 * is content that is invisible forever if the observer never does.
 */

const STEPS = [
  {
    label: "Find",
    title: "The right people",
    body: "Launch a research study on a topic your market cares about. Birdsong recruits participants who match your ICP.",
  },
  {
    label: "Talk",
    title: "Real interviews",
    body: "An AI moderator runs each interview, asks follow-ups, and learns their needs, timing, and budget.",
  },
  {
    label: "Route",
    title: "Straight to sales",
    body: "Qualified opportunities land in your CRM with a summary your reps can act on.",
  },
];

export function StepsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          obs.disconnect();
        }
      },
      // A negative bottom margin shrinks the root box to the top 85% of the
      // viewport, which is the handoff's "top < innerHeight * 0.85" threshold
      // expressed as geometry instead of a scroll handler.
      { rootMargin: "0px 0px -15% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="steps"
      className="bg-transparent px-[24px] pb-[120px] pt-[40px] bsl-wide:px-[48px]"
    >
      <div
        ref={ref}
        className="mx-auto grid max-w-[1480px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] border-t border-bsl-line-soft"
      >
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-[14px] pr-[32px] pt-[40px] transition-[opacity,transform] duration-1000 [transition-timing-function:cubic-bezier(.2,.7,.2,1)] ${
              shown ? "translate-y-0 opacity-100" : "translate-y-[32px] opacity-0"
            }`}
            style={{ transitionDelay: `${i * 0.18}s` }}
          >
            <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-bsl-forest">
              {s.label}
            </div>
            <div className="font-bsl-serif text-[40px] leading-[1.05] text-bsl-ink">{s.title}</div>
            <div className="max-w-[380px] text-[18px] leading-[1.5] text-bsl-body-soft">
              {s.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
