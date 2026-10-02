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
 * Same mark as components/marketing/BirdMark.tsx (viewBox 0 0 50 44); drawn
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
              <svg viewBox="0 0 50 44" width={72} height={66} fill="none" className="block">
                <path
                  d="M7 1.5 C9 9 15 13.6 23 14 C32 14.4 37.9 21 37.3 31 L45.3 34.6 L36.4 36.5 C34 39.5 30.5 41 26 41 L7 41 L17 28.5 C8 27.5 2 21.5 2 14 C2 8.5 4 4.5 7 1.5 Z M32 22.8 A1.9 1.9 0 1 0 32 26.9 A1.9 1.9 0 1 0 32 22.8 Z"
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
