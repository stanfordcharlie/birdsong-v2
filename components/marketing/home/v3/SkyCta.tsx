import { CtaFlock } from "./Flock";
import { bslGlass, bslSolid } from "./buttons";

/**
 * Final CTA: a dark panel inside a 22px gradient frame.
 *
 * The frame is the section's padding, not a border — a horizontal sweep
 * through the whole palette (sky, sage, forest, butter, sky again) showing as
 * a band around the panel. The near-black behind it is what the band reads
 * against on the outer edge.
 *
 * The panel itself is three radial glows over a flat --bsl-cta-panel: butter
 * and forest rising from below the bottom edge, sky coming in from off the
 * top-right corner, sage from off the top-left. All three are centred outside
 * the panel so no glow has a visible hot spot inside it.
 *
 * Over that, a fractal-noise grain at 22% in `overlay`. It is an inline SVG
 * data URI rather than a raster: a tiling PNG large enough not to show its
 * seam would be tens of kilobytes, and feTurbulence is a few hundred bytes
 * that never repeats visibly at 180px. `overlay` rather than a flat alpha so
 * the grain lifts the glows and darkens the shadows instead of greying the
 * whole panel evenly.
 */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const PANEL = [
  "radial-gradient(ellipse 60% 70% at 50% 115%, rgba(232,199,122,.55) 0%, rgba(59,98,70,.45) 38%, rgba(22,26,23,0) 72%)",
  "radial-gradient(ellipse 45% 55% at 85% -10%, rgba(91,141,184,.55) 0%, rgba(22,26,23,0) 70%)",
  "radial-gradient(ellipse 40% 50% at 10% 0%, rgba(201,220,198,.35) 0%, rgba(22,26,23,0) 70%)",
].join(",");

export function SkyCta({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <section id="demo" className="bg-bsl-cta-frame">
      <div
        className="relative p-[22px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgb(var(--bsl-sky-pale)) 0%, rgb(var(--bsl-sage)) 22%, rgb(var(--bsl-forest)) 48%, rgb(var(--bsl-butter-soft)) 72%, rgb(var(--bsl-sky-mid)) 100%)",
        }}
      >
        <div
          className="relative flex min-h-[clamp(420px,52vw,620px)] flex-col items-center justify-center gap-[36px] overflow-hidden bg-bsl-cta-panel px-[24px] py-[96px] text-center bsl-wide:px-[32px]"
          style={{ backgroundImage: PANEL }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
            style={{ backgroundImage: GRAIN }}
          />
          <CtaFlock />

          <h2 className="relative m-0 max-w-[1100px] text-balance font-bsl-serif text-[clamp(48px,6.4vw,104px)] font-normal leading-none tracking-[-0.02em] text-bsl-cream">
            Your audience is already talking. Start listening.
          </h2>
          <p className="relative m-0 max-w-[620px] text-pretty text-[20px] leading-[1.5] text-bsl-cream-dim">
            Launch a research study with your market and see qualified conversations in your CRM
            within a week.
          </p>
          <div className="relative flex flex-wrap justify-center gap-[12px]">
            <a href={bookDemoUrl} className={`${bslSolid} px-[30px] py-[18px] text-[18px]`}>
              Book a demo <span aria-hidden className="font-bsl-glyph">→</span>
            </a>
            <a href="#how" className={`${bslGlass} px-[30px] py-[18px] text-[18px]`}>
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
