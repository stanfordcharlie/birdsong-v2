"use client";

import { useEffect, useRef } from "react";
import { spectral } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { MarketingBodyEffects } from "./MarketingBodyEffects";

// Matches the literal --lp-bg value in globals.css (a CSS custom property
// can't be read from here to hand to MarketingBodyEffects, which sets
// document.body.style.backgroundColor directly).
const BODY_COLOR = "#faf8f1";

// Root wrapper for both marketing landing pages
// (design_handoff_landing_pages_full). Owns every page-level scroll
// behaviour in one rAF-throttled listener, matching the handoff's own
// componentDidMount:
//   1. the reveal observer, which adds .lp-in to each [data-reveal] once
//      16% visible and then stops watching it (one-shot),
//   2. the top progress rail's width,
//   3. the nav's condensed/shadowed scrolled state past 40px.
//
// It used to also scrub the "how it works" section's active step from how
// far through its 300vh scroller the viewport had travelled. That section is
// static now (see SequenceSection), so nothing here reads it.
export function LandingPageShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lp-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16 }
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const prog = root.querySelector<HTMLElement>("#lp-prog");
    const nav = root.querySelector<HTMLElement>("[data-landing-nav]");
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || document.documentElement.scrollTop;

        if (prog) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          prog.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
        }
        if (nav) nav.setAttribute("data-scrolled", y > 40 ? "1" : "0");
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        // Inter is already on <html> from the root layout; Spectral (the
        // landing display + pull-quote face) is scoped to this shell.
        spectral.variable,
        // overflow-x-clip, not overflow-x-hidden: `hidden` on one axis
        // computes the other from visible to auto, which makes this div a
        // scroll container — and LandingNav's `sticky` then resolves
        // against *this* box instead of the viewport. Since the box grows
        // to full content height it never scrolls itself, so the nav just
        // rode up out of view. `clip` does the same clipping (the CTA bird
        // flies 420px right, see lp-takeoff) without the scroll container.
        "lp-shell min-h-screen overflow-x-clip bg-landing-bg font-sans text-landing-ink"
      )}
    >
      <MarketingBodyEffects color={BODY_COLOR} />
      <div id="lp-prog" aria-hidden="true" />
      {children}
    </div>
  );
}
