import { BirdMark } from "./BirdMark";

/**
 * The drifting flocks — 15 birds over the hero's sky, 6 more around the edges
 * of the final CTA panel.
 *
 * Coordinates are the handoff's own, verbatim, and they are load-bearing
 * rather than decorative: every hero bird sits at x 52-86% / y 6-48%, which
 * is the band to the right of and above the headline. Nudging one left starts
 * putting a black silhouette on top of "Turn your audience into pipeline."
 *
 * That band only exists while the hero is two columns. Once the feature cards
 * drop below the copy the hero is ~1340px tall and the copy runs the full
 * width, so the same percentages put birds across the headline, the subhead
 * and both buttons — which is the one thing the handoff says must not happen.
 * HERO_NARROW is a separate, smaller flock for that case, placed in px inside
 * a fixed band under the nav rather than in percentages of a hero whose
 * height now depends on how the copy wrapped. It is the handoff's motif at a
 * size that fits, not the desktop flock squeezed.
 *
 * Percentage positions and a px width, so the flock keeps its shape as the
 * hero changes size but the birds themselves do not scale with it — they read
 * as fixed-size birds at varying distance, not as one bird zoomed.
 *
 * The drift itself is .bsl-bird in app/globals.css, which is bound only under
 * prefers-reduced-motion: no-preference; the per-bird duration and delay ride
 * in as custom properties. The delays are negative so the animation starts
 * mid-cycle: at 0s an unstaggered flock beats in perfect unison, which looks
 * mechanical, and the negative offset is what breaks that up on the first
 * frame rather than several seconds in.
 */

// [left %, top %, width px, rotation deg]
type Bird = [number, number, number, number];

const HERO: Bird[] = [
  [58, 22, 54, -8],
  [64, 30, 34, -4],
  [52, 34, 40, -12],
  [70, 18, 26, 6],
  [76, 27, 22, -2],
  [53, 16, 30, -6],
  [61, 40, 28, -10],
  [82, 36, 18, 4],
  [56, 8, 20, -3],
  [67, 44, 20, -8],
  [57, 28, 22, -14],
  [74, 10, 16, 2],
  [86, 22, 14, -5],
  [80, 44, 16, -9],
  [62, 6, 14, 0],
];

// Below `bsl-wide`. Positioned inside the 130px band the hero reserves under
// the nav (see SkyHero's mobile top padding), so x is still a percentage of
// the full width — the copy is below the band, not beside it, so the birds
// get to use all of it.
const HERO_NARROW: Bird[] = [
  [10, 22, 18, -6],
  [28, 56, 24, -10],
  [46, 10, 32, -4],
  [62, 62, 16, 4],
  [75, 26, 30, -8],
  [88, 50, 20, -3],
  [36, 84, 14, 2],
];

const CTA: Bird[] = [
  [8, 18, 22, -6],
  [14, 28, 14, -10],
  [86, 20, 26, 4],
  [91, 34, 16, 0],
  [80, 70, 18, -8],
  [12, 72, 16, -4],
];

function FlockLayer({
  birds,
  duration,
  className,
  opacity,
  band = "inset-0",
}: {
  birds: Bird[];
  duration: (i: number) => number;
  className: string;
  opacity: (size: number) => number;
  /** The box the percentage coordinates resolve against. */
  band?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${band}`}>
      {birds.map(([x, y, size, rotate], i) => (
        <div
          key={i}
          className={`bsl-bird absolute ${className}`}
          style={
            {
              left: `${x}%`,
              top: `${y}%`,
              "--bsl-dur": `${duration(i)}s`,
              "--bsl-delay": `${-i * 0.7}s`,
            } as React.CSSProperties
          }
        >
          <BirdMark
            width={size}
            className="block"
            style={{ transform: `rotate(${rotate}deg)`, opacity: opacity(size) }}
          />
        </div>
      ))}
    </div>
  );
}

// The larger birds are the near ones, so they sit more solidly against the
// sky; the small ones hold back into the haze.
const heroOpacity = (size: number) => (size > 30 ? 0.92 : 0.78);

export function HeroFlock() {
  return (
    <>
      <div className="hidden bsl-wide:contents">
        <FlockLayer
          birds={HERO}
          duration={(i) => 9 + (i % 5) * 2}
          className="text-bsl-flock"
          opacity={heroOpacity}
        />
      </div>
      <div className="contents bsl-wide:hidden">
        <FlockLayer
          birds={HERO_NARROW}
          duration={(i) => 9 + (i % 5) * 2}
          className="text-bsl-flock"
          opacity={heroOpacity}
          band="inset-x-0 top-[92px] h-[110px]"
        />
      </div>
    </>
  );
}

export function CtaFlock() {
  return (
    <FlockLayer
      birds={CTA}
      duration={(i) => 10 + i * 1.5}
      className="text-bsl-cream"
      opacity={() => 0.55}
    />
  );
}
