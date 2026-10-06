import type { Metadata } from "next";
import { ConversationSection } from "@/components/marketing/home/v3/ConversationSection";
import { SkyBand } from "@/components/marketing/home/v3/SkyBand";
import { SkyCta } from "@/components/marketing/home/v3/SkyCta";
import { SkyHero } from "@/components/marketing/home/v3/SkyHero";
import { SkyNav } from "@/components/marketing/home/v3/SkyNav";
import { SkyShell } from "@/components/marketing/home/v3/SkyShell";
import { StepsSection } from "@/components/marketing/home/v3/StepsSection";
import { siteUrl } from "@/lib/reports/site";

// Where every "Book a demo" on the page points. Still the in-page anchor the
// design reference shipped with, which lands on the final CTA — swap for the
// real scheduler URL and all three call sites follow.
const BOOK_DEMO_URL = "#demo";

// This page is the product pitch. It rendered at `/` until the founder
// letter took the root, and moved here unchanged; the title and description
// are the same two strings the domain has always ranked on, kept verbatim
// through the move so the existing search results and social previews point
// at the page that still matches them.
const TITLE = "Birdsong — Turn Your Audience Into Pipeline";
const DESCRIPTION =
  "Birdsong Agents Find The Right People, Talk To Them, And Route Qualified Opportunities Straight To Your Sales Team.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Absolute, built from siteUrl() rather than a bare "/product": the app
  // sets no metadataBase, so a relative canonical would resolve against
  // localhost. Same helper the report pages canonicalise with, so every
  // public page agrees on one origin.
  alternates: { canonical: `${siteUrl()}/product` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Birdsong",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ProductPage() {
  return (
    <SkyShell>
      <SkyNav bookDemoUrl={BOOK_DEMO_URL} />
      <main>
        {/* The first three sections share one sky gradient and are transparent
            themselves, so they have to stay inside SkyBand and in this order —
            the ramp is in percentages of their combined height. The CTA is
            outside it and paints its own closing ramp, and renders the footer
            itself rather than the page doing it. */}
        <SkyBand>
          <SkyHero bookDemoUrl={BOOK_DEMO_URL} />
          <ConversationSection />
          <StepsSection />
        </SkyBand>
        <SkyCta bookDemoUrl={BOOK_DEMO_URL} />
      </main>
    </SkyShell>
  );
}
