import { BirdMark } from "./BirdMark";

/**
 * The drifting flocks — 12 birds across the top of the hero's sky, 6 more
 * around the edges of the closing CTA.
 *
 * Coordinates are the handoff's own, verbatim, and they are load-bearing
 * rather than decorative. v5 moved the hero flock out of the old 53-86% x /
 * 6-48% y block and into a shallow band at x 50-94%, y 12.5-19%: the birds no
 * longer fill the quadrant beside the headline, they cross above it in a line,
 * which is also why the sizes compressed (the old flock ran 14-54px, this one
 * 12-36px — nothing in it is close enough to the viewer to be large). Nudging
 * one down starts putting a silhouette on "Turn your audience into pipeline."
 *
 * That band only exists while the hero is two columns. Once the feature panel
 * drops below the copy the hero is far taller and the copy runs full width, so
 * the same percentages put birds across the headline, the subhead and both
 * buttons — the one thing the handoff says must not happen. HERO_NARROW is a
 * separate, smaller flock for that case, placed in px inside a fixed band
 * under the nav rather than in percentages of a hero whose height now depends
 * on how the copy wrapped. It is the handoff's motif at a size that fits, not
 * the desktop flock squeezed.
 *
 * Percentage positions and a px width, so the flock keeps its shape as the
 * hero changes size but the birds themselves do not scale with it — they read
 * as fixed-size birds at varying distance, not as one bird zoomed.
 *
 * Two nested animations per bird, both in app/globals.css and both bound only
 * under prefers-reduced-motion: no-preference. The outer element runs the
 * one-shot `bsl-fly` entry; the inner runs the infinite `bsl-drift`. They have
 * to be separate elements because both animate `transform`. The drift delays
 * are negative so the loop starts mid-cycle: at 0s an unstaggered flock beats
 * in perfect unison, which looks mechanical, and the negative offset is what
 * breaks that up on the first frame rather than several seconds in.
 */

// [left %, top %, width px, rotation deg]
type Bird = [number, number, number, number];

const HERO: Bird[] = [
  [50, 15, 26, -10],
  [56.5, 12.5, 18, -4],
  [61, 17.5, 36, -8],
  [67.5, 13, 22, -3],
  [72, 18.5, 18, -12],
  [76.5, 12.5, 28, 4],
  [81.5, 17, 20, -6],
  [86, 13, 16, 2],
  [90.5, 18.5, 14, -9],
  [94, 13.5, 12, -5],
  [64, 19, 14, 0],
  [70, 16, 12, -6],
];

// Below `bsl-wide`. Positioned inside the band the hero reserves under the nav
// (see SkyHero's mobile top padding), so x is still a percentage of the full
// width — the copy is below the band, not beside it, so the birds get all of
// it.
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
  flyIn = false,
}: {
  birds: Bird[];
  duration: (i: number) => number;
  className: string;
  opacity: (size: number) => number;
  /** The box the percentage coordinates resolve against. */
  band?: string;
  /** Whether these birds arrive with the load intro. The CTA's do not — they
      are already in place by the time that section is scrolled to, and the
      section does its own fade-in around them. */
  flyIn?: boolean;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${band}`}>
      {birds.map(([x, y, size, rotate], i) => {
        const bird = (
          <div
            className={`bsl-bird ${className}`}
            style={
              {
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
        );
        return (
          <div
            key={i}
            className={`absolute ${flyIn ? "bsl-fly" : ""}`}
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                ...(flyIn
                  ? {
                      // Four entry speeds and a 0.07s-per-bird stagger, so the
                      // flock arrives as a ragged line rather than a formation.
                      "--bsl-dur": `${1.9 + (i % 4) * 0.25}s`,
                      "--bsl-delay": `${0.15 + i * 0.07}s`,
                    }
                  : {}),
              } as React.CSSProperties
            }
          >
            {bird}
          </div>
        );
      })}
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
          flyIn
        />
      </div>
      <div className="contents bsl-wide:hidden">
        <FlockLayer
          birds={HERO_NARROW}
          duration={(i) => 9 + (i % 5) * 2}
          className="text-bsl-flock"
          opacity={heroOpacity}
          band="inset-x-0 top-[92px] h-[110px]"
          flyIn
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
