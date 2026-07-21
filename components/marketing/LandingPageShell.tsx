import { bricolage, spectral } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { MarketingBodyEffects } from "./MarketingBodyEffects";

// Matches the literal --lp-bg values in globals.css (can't read a CSS
// custom property from here to hand to MarketingBodyEffects, which sets
// document.body.style.backgroundColor directly).
const TONE_BODY_COLOR = {
  cream: "#f3ecdf",
  eggshell: "#faf8f1",
} as const;

// Root wrapper for both marketing landing pages (design_handoff_landing_pages_full).
// tone picks which of the two --lp-bg/surface/border variants (globals.css)
// this page renders in — cream is the demand-gen page's default, eggshell
// the customer-success page's, per the design handoff's own per-page
// prototype defaults.
export function LandingPageShell({
  children,
  tone = "cream",
}: {
  children: React.ReactNode;
  tone?: "cream" | "eggshell";
}) {
  return (
    <div
      data-tone={tone === "eggshell" ? "eggshell" : undefined}
      className={cn(
        bricolage.variable,
        spectral.variable,
        "min-h-screen overflow-x-hidden bg-landing-bg font-sans text-landing-ink"
      )}
    >
      <MarketingBodyEffects color={TONE_BODY_COLOR[tone]} />
      {children}
    </div>
  );
}
