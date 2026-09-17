import { dmSans, materialSymbols, plusJakarta } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * Root wrapper for both pages in the green sticker system
 * (birdsong-green-sticker-redesign-2026-09): the marketing landing page and
 * the research report template.
 *
 * Deliberately not LandingPageShell. That shell carries the other marketing
 * surface's tone, fonts and its whole scroll runtime — a progress rail, a
 * reveal observer and a condensing nav — none of which this design has. The
 * redesign is static apart from one CSS marquee and the hero collage's
 * resize measurement, so the page has no page-level client component at all
 * and this stays a server component.
 *
 * The three faces are scoped here rather than in app/layout.tsx so admin,
 * the respondent survey and the other marketing pages don't download them.
 *
 * `scroll-smooth` is on for the report page's contents rail, whose links are
 * in-page anchors; the landing page's nav anchors get it too, which the
 * handoff asks for there as well.
 */
export function GreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        plusJakarta.variable,
        dmSans.variable,
        materialSymbols.variable,
        // overflow-x-clip, not -hidden: the CTA band's decorative rings and
        // arches hang past the viewport edge on both sides, and `hidden` on
        // one axis turns this box into a scroll container (which would break
        // the nav's `sticky` the same way it did on the other landing shell).
        "min-h-screen scroll-smooth overflow-x-clip bg-ln-cream font-dmsans text-ln-ink antialiased"
      )}
    >
      {children}
    </div>
  );
}
