import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeShell } from "@/components/marketing/home/v2/HomeShell";
import { HeroIntroGate } from "@/components/marketing/home/v2/HeroIntroGate";
import { HomeNav } from "@/components/marketing/home/v2/HomeNav";
import { HomeHero } from "@/components/marketing/home/v2/HomeHero";
import { ProductSection } from "@/components/marketing/home/v2/ProductSection";
import { CtaBanner } from "@/components/marketing/home/v2/CtaBanner";
import { LeadComparison } from "@/components/marketing/home/v2/LeadComparison";
import { FinalCta } from "@/components/marketing/home/v2/FinalCta";
import { HomeFooter } from "@/components/marketing/home/v2/HomeFooter";

// Where every "Book a demo" on the page points. Still the in-page anchor the
// design reference shipped with, which lands on the final CTA — swap for the
// real scheduler URL and all five call sites follow.
const BOOK_DEMO_URL = "#demo";

// This is the primary indexed page for the domain, so metadata here (not
// the generic fallback in app/layout.tsx) is what search/social previews
// actually show for usebirdsong.com.
const TITLE = "Birdsong — Turn Your Audience Into Pipeline";
const DESCRIPTION =
  "Birdsong Agents Find The Right People, Talk To Them, And Route Qualified Opportunities Straight To Your Sales Team.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Supabase should send email-confirmation clicks straight to
  // /api/auth/callback (via the signup call's emailRedirectTo), but if its
  // Site URL config forces the redirect back to the site root instead, the
  // ?code= lands here still unexchanged. Forward it to the callback route so
  // the session actually gets created rather than stranding the user, logged
  // out, on the marketing page with a raw code in the URL.
  const { code } = await searchParams;
  if (code) {
    redirect(`/api/auth/callback?code=${encodeURIComponent(code)}&next=/admin`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitors landing on the public marketing URL (bare domain,
  // bookmark, back button) belong in the app, not looking at the pitch.
  if (user) {
    redirect("/admin");
  }

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
