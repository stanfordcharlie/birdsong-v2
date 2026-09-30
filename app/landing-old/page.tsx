import type { Metadata } from "next";
import { HomeShell } from "@/components/marketing/home/v2/HomeShell";
import { HeroIntroGate } from "@/components/marketing/home/v2/HeroIntroGate";
import { HomeNav } from "@/components/marketing/home/v2/HomeNav";
import { HomeHero } from "@/components/marketing/home/v2/HomeHero";
import { ProductSection } from "@/components/marketing/home/v2/ProductSection";
import { CtaBanner } from "@/components/marketing/home/v2/CtaBanner";
import { LeadComparison } from "@/components/marketing/home/v2/LeadComparison";
import { FinalCta } from "@/components/marketing/home/v2/FinalCta";
import { HomeFooter } from "@/components/marketing/home/v2/HomeFooter";

/**
 * The previous homepage — the v2 direction that rendered at `/` until the
 * sky redesign (design_handoff_birdsong_landing, `Birdsong Landing.dc.html`)
 * replaced it.
 *
 * Kept as a live route, not just a git revert, so the two directions can be
 * opened side by side. Everything here is byte-for-byte what `/` served, with
 * two deliberate omissions: the `?code=` forward and the signed-in redirect
 * to /admin. Both existed because `/` is the bare domain that Supabase and
 * bookmarks land on; neither applies to a comparison URL, and redirecting a
 * signed-in visitor away from it would defeat the point of keeping it.
 *
 * noindex: this is the same pitch, in the same words, as the page that is now
 * the canonical `/`. Two indexable URLs with that much shared copy is exactly
 * the duplicate-content case that costs the real page its ranking.
 *
 * Safe to delete once the sky direction has settled — nothing links here, and
 * `git log app/page.tsx` still has it either way.
 */
export const metadata: Metadata = {
  title: "Birdsong — previous homepage",
  robots: { index: false, follow: false },
};

const BOOK_DEMO_URL = "#demo";

export default function LandingOldPage() {
  return (
    <>
      {/* Must precede the nav and hero in the HTML: it decides, while the
          document is still parsing, whether they render hidden for the intro
          or in their final state. */}
      <HeroIntroGate />
      <HomeShell>
        <HomeNav bookDemoUrl={BOOK_DEMO_URL} />
        <HomeHero bookDemoUrl={BOOK_DEMO_URL} />
        <ProductSection />
        <CtaBanner bookDemoUrl={BOOK_DEMO_URL} />
        <LeadComparison />
        <FinalCta />
        <HomeFooter bookDemoUrl={BOOK_DEMO_URL} />
      </HomeShell>
    </>
  );
}
