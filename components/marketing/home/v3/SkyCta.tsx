"use client";

import { useEffect, useRef, useState } from "react";
import { CtaFlock } from "./Flock";
import { SkyFooter } from "./SkyFooter";
import { bslGlass, bslSolid } from "./buttons";

/**
 * The closing CTA: the sky coming back.
 *
 * v4 took this apart. It used to be a dark panel inside a 22px horizontal
 * gradient frame — a framed object sitting on the page — and is now the page
 * itself turning back into sky. No frame, no card, no edges: the section is
 * one vertical ramp (--bsl-cta-sky) that starts on the exact cream the steps
 * section ended on and climbs to deep blue, so the join above it is invisible
 * and the page closes on the same material it opened with.
 *
 * Losing the panel lost the thing the grain and the glows were painted on, so
 * both are now full-bleed layers masked to the middle of the section:
 * transparent at the top, solid through 38-68%, transparent again at the
 * bottom. The mask is what replaces the panel's edges — it keeps the texture
 * off the cream at the top and off the deepest blue at the bottom, where
 * either would show as a rectangle.
 *
 * The grain is an inline SVG data URI rather than a raster: a tiling PNG large
 * enough not to show its seam would be tens of kilobytes, and feTurbulence is
 * a few hundred bytes that never repeats visibly at 180px. `overlay` rather
 * than a flat alpha so the grain lifts the glows and darkens the shadows
 * instead of greying the section evenly.
 *
 * The footer renders inside this section rather than after it (v4). It has to:
 * the ramp ends at #2c4f73 and a footer below the section would need its own
 * matching background, which is the seam this whole change exists to remove.
 *
 * The reveal is the same arrangement as StepsSection's, with one addition —
 * the headline, subhead and buttons each carry their own transition delay on
 * top of the container's, so the block assembles rather than appearing. The
 * footer is deliberately outside it: it should not fade, it should just be
 * there when you reach the bottom.
 */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// Butter rising from below the text, over a broad lift through the middle of
// the ramp. Both are centred low, so neither has a hot spot near the headline.
const GLOW = [
  "radial-gradient(ellipse 55% 40% at 50% 78%, rgba(232,199,122,.32) 0%, rgba(232,199,122,0) 70%)",
  "linear-gradient(180deg, rgba(44,79,115,0) 0%, rgba(53,95,137,.6) 45%, rgba(44,79,115,.35) 100%)",
].join(",");

const MASK = "linear-gradient(180deg, transparent 0%, #000 38%, #000 68%, transparent 100%)";

export function SkyCta({ bookDemoUrl }: { bookDemoUrl: string }) {
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
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const rise = (delay: string) =>
    `transition-[opacity,transform] duration-[900ms] [transition-timing-function:cubic-bezier(.2,.7,.2,1)] ${delay} ${
      shown ? "translate-y-0 opacity-100" : "translate-y-[28px] opacity-0"
    }`;

  return (
    <section
      id="demo"
      className="overflow-hidden"
      style={{ backgroundImage: "var(--bsl-cta-sky)" }}
    >
      <div className="relative pt-[120px]">
        <div
          ref={ref}
          className={`relative flex min-h-[clamp(520px,60vw,760px)] flex-col items-center justify-center gap-[36px] px-[24px] pb-[120px] pt-[200px] text-center bsl-wide:px-[32px] ${rise("")}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: GLOW, maskImage: MASK, WebkitMaskImage: MASK }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
            style={{ backgroundImage: GRAIN, maskImage: MASK, WebkitMaskImage: MASK }}
          />
          <CtaFlock />

          <h2
            className={`relative m-0 max-w-[1100px] text-balance font-bsl-serif text-[clamp(48px,6.4vw,104px)] font-normal leading-none tracking-[-0.02em] text-bsl-cream ${rise("delay-[250ms]")}`}
          >
            Your next customers are waiting to be asked.
          </h2>
          <p
            className={`relative m-0 max-w-[620px] text-pretty text-[20px] leading-[1.5] text-bsl-cream-dim ${rise("delay-[450ms]")}`}
          >
            Launch a research study with your market and see qualified conversations in your CRM
            within a week.
          </p>
          <div
            className={`relative flex flex-wrap justify-center gap-[12px] ${rise("delay-[600ms]")}`}
          >
            <a href={bookDemoUrl} className={`${bslSolid} px-[30px] py-[18px] text-[18px]`}>
              Book a demo{" "}
              <span aria-hidden className="font-bsl-glyph">
                →
              </span>
            </a>
            <a href="#how" className={`${bslGlass} px-[30px] py-[18px] text-[18px]`}>
              See how it works
            </a>
          </div>
        </div>
      </div>

      <SkyFooter />
    </section>
  );
}
