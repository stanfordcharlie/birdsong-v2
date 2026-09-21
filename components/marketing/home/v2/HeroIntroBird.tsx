"use client";

import { useRef } from "react";
import { useHeroIntro } from "./useHeroIntro";

/**
 * The bird that carries the `/` hero's page-load intro, plus the four notes
 * it sings from the "T". Both boxes sit at the perch point (--px/--py, set
 * by useHeroIntro) inside the hero, which is position:relative; nothing here
 * is a full-screen overlay. Outside the intro (return visit, reduced motion,
 * JS off) both are display:none, so SSR's hero is untouched.
 *
 * The bird is four nested layers because every keyframe uses fill-mode
 * both, and two fill-both animations on one element's transform would fight
 * (the later one's 0% frame would override the earlier one for the whole of
 * its delay). One transform per layer instead:
 *   .hp-i-bird          flight to the nav slot
 *   .hp-i-bird-arrive   swoop in from off-screen left
 *   .hp-i-bird-land     landing squash
 *   .hp-i-bird-chirp    the rocking while it sings
 *
 * The notes are a sibling box rather than children so they hang in the air
 * over the headline while the bird leaves for the nav.
 *
 * Same mark as components/marketing/BirdMark.tsx (viewBox 0 0 48 44); drawn
 * inline because the eye here is knocked out with the hero's cream and the
 * fill is the hero's ink, not the --lp-* pair that component reads.
 */
const NOTES = [
  { glyph: "♪", size: 28, color: "text-hp-green", delay: "1.9s", dx: 36, dy: -84, rot: -12 },
  { glyph: "♫", size: 34, color: "text-hp-ink", delay: "2.05s", dx: 74, dy: -60, rot: 10 },
  { glyph: "♩", size: 24, color: "text-hp-green", delay: "2.2s", dx: 54, dy: -104, rot: -8 },
  { glyph: "♪", size: 30, color: "text-hp-ink", delay: "2.35s", dx: 92, dy: -86, rot: 14 },
] as const;

export function HeroIntroBird() {
  const ref = useRef<HTMLDivElement>(null);
  useHeroIntro(ref);

  return (
    <>
      <div ref={ref} aria-hidden="true" className="hp-i-bird">
        <div className="hp-i-bird-arrive">
          <div className="hp-i-bird-land">
            <div className="hp-i-bird-chirp">
              <svg viewBox="0 0 48 44" width={72} height={66} fill="none" className="block">
                <path
                  d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z M34.8 25.5 A1.8 1.8 0 1 0 31.2 25.5 A1.8 1.8 0 1 0 34.8 25.5 Z"
                  fill="rgb(var(--hp-ink))"
                  fillRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="hp-i-notes">
        {NOTES.map((n, i) => (
          <span
            key={i}
            className={`hp-i-glyph font-hp-serif ${n.color}`}
            style={
              {
                fontSize: `${n.size}px`,
                "--i-delay": n.delay,
                "--dx": `${n.dx}px`,
                "--dy": `${n.dy}px`,
                "--dr": `${n.rot}deg`,
              } as React.CSSProperties
            }
          >
            {n.glyph}
          </span>
        ))}
      </div>
    </>
  );
}
