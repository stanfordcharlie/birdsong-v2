import { caveat, instrumentSans, instrumentSerif, sourceSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * Root wrapper for `/` in the v2 direction (design_handoff_birdsong_landing,
 * `Birdsong Landing v2.dc.html`).
 *
 * Replaces GreenShell here rather than extending it: v2 swapped the entire
 * face stack (Plus Jakarta Sans + DM Sans + Material Symbols → the four
 * below) and dropped the marquee those shells carried, so nothing of
 * GreenShell's survives on this route. GreenShell itself stays — the
 * research report pages still render inside it.
 *
 * The faces are scoped here, not in app/layout.tsx, so admin, the respondent
 * survey and the other marketing pages don't download them.
 *
 * overflow-x-clip, not -hidden: the hero's tilted notes and the CTA banner's
 * decorative circles hang past their containers, and `hidden` on one axis
 * would turn this into a scroll container.
 */
export function HomeShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        instrumentSerif.variable,
        sourceSerif.variable,
        instrumentSans.variable,
        caveat.variable,
        "min-h-screen scroll-smooth overflow-x-clip bg-hp-cream font-hp-sans text-hp-ink antialiased"
      )}
    >
      {children}
    </div>
  );
}
