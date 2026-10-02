import { bricolage, caveat, instrumentSans, instrumentSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * Root wrapper for the sky direction (design_handoff_birdsong_landing,
 * `Birdsong Landing.dc.html`), which renders at `/`.
 *
 * Four faces. Instrument Serif carries every headline, Instrument Sans every
 * other word, Caveat nothing at the moment (v4 removed both handwritten
 * annotations, and it stays loaded here because the face is scoped per-shell
 * and the demo well is the obvious next place for one), and Bricolage
 * Grotesque exactly one string: the nav wordmark, which v5 moved off the
 * serif. Source Serif 4 — the v2 home's wordmark face — is not loaded here.
 *
 * Scoped here rather than in app/layout.tsx for the same reason HomeShell
 * scopes its own — admin, the respondent survey and the other marketing
 * pages must not download them.
 *
 * leading-[normal] undoes Tailwind preflight's `html { line-height: 1.5 }`.
 * The handoff sets a line-height on exactly the elements that need one (the
 * headlines at .94-1.05, body copy at 1.35-1.5) and leaves everything else —
 * eyebrows, uppercase labels, button text, the feature-card tag rows — on the
 * browser default, which for Instrument Sans is about 1.27. Inheriting 1.5
 * into all of those added 3px to every card, 5px to every button and pushed
 * the hero copy 9px up the page. Resetting once here is the fix; the explicit
 * leading-* utilities at the call sites still win over it.
 *
 * The bsl-page class is a marker, not a style: app/globals.css hangs the
 * overscroll canvas colour off `html:has(.bsl-page)` so that scrolling up past
 * the top of the hero shows more sky rather than the cream canvas.
 *
 * overflow-x-clip, not -hidden: the hero flock's right-most birds sit at 94%
 * with their own width past that, the load intro starts every one of them a
 * further 62vw off the left edge, and `hidden` on one axis would quietly turn
 * this into a scroll container and break the nav's `fixed` positioning.
 */
export function SkyShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        instrumentSerif.variable,
        instrumentSans.variable,
        caveat.variable,
        bricolage.variable,
        "bsl-page min-h-screen scroll-smooth overflow-x-clip bg-bsl-cream font-bsl-sans leading-[normal] text-bsl-ink antialiased"
      )}
    >
      {children}
    </div>
  );
}
