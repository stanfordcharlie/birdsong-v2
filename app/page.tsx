import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationSection } from "@/components/marketing/home/v3/ConversationSection";
import { SkyBand } from "@/components/marketing/home/v3/SkyBand";
import { SkyCta } from "@/components/marketing/home/v3/SkyCta";
import { SkyHero } from "@/components/marketing/home/v3/SkyHero";
import { SkyNav } from "@/components/marketing/home/v3/SkyNav";
import { SkyShell } from "@/components/marketing/home/v3/SkyShell";
import { StepsSection } from "@/components/marketing/home/v3/StepsSection";

// Where every "Book a demo" on the page points. Still the in-page anchor the
// design reference shipped with, which lands on the final CTA — swap for the
// real scheduler URL and all three call sites follow.
const BOOK_DEMO_URL = "#demo";

// This is the primary indexed page for the domain, so metadata here (not
// the generic fallback in app/layout.tsx) is what search/social previews
// actually show for usebirdsong.com.
//
// Deliberately unchanged by the sky redesign. It is the same sentence the
// page has always led with, and these two strings are what the domain
// currently ranks on — rewriting them to match the new hero's sentence case
// would churn every search result and social preview for a typographic
// difference nobody outside this file would notice.
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
