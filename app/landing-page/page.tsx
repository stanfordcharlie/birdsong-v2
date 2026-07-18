import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { LandingNav } from "@/components/marketing/LandingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProductDemo, type ProductDemoContent } from "@/components/marketing/ProductDemo";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { FooterCta } from "@/components/marketing/FooterCta";

export const metadata: Metadata = {
  title: "Birdsong — Your best leads are already singing.",
  description:
    "Birdsong invites the people you want to sell to into genuine conversations about their work, then hands your team qualified leads with the whole story already there.",
};

const DEMO_CONTENT: ProductDemoContent = {
  sessionSubtitle: "Go-to-market in mid-market SaaS · 20 min · paid session",
  questionProgressLabel: "Question 4 of 8",
  joiningLine: "Maya accepted your invite · joining the session…",
  question: "What part of your inbound process eats the most time for your team?",
  answer:
    "Honestly? Qualifying. Our SDRs spend half the day on leads that go nowhere, and the good ones wait two days for a reply.",
  doneLabel: "Conversation complete · 19 min",
  teamLabel: "Delivered to your team",
  avatarInitials: "MC",
  personName: "Maya Chen",
  personMeta: "Head of Growth · Coretide",
  conversationMeta: "Conversation complete · 8 questions · 19 min",
  extractedChip: "Pain point: slow inbound follow-up is costing deals",
  scoreFieldLabel: "Lead score",
  qualifiedScoreWidth: "91%",
  qualifiedScoreLabel: "91, strong",
  qualifiedBadgeLabel: "Qualified",
  ctaButtonLabel: "Book demo",
  successLine: "Demo booked: Thursday 10:30 AM with Sam (AE, West)",
};

const FEATURES = [
  {
    title: "Context, attached",
    body: "Every lead arrives with the conversation: what hurts, who is involved, when they want to move.",
  },
  {
    title: "Scoring you define",
    body: "Fit is measured against your ICP, in criteria you can read. Not a black-box number.",
  },
  {
    title: "Routing that holds",
    body: "Territory, segment, round-robin. The right rep gets the lead the first time.",
  },
  {
    title: "Booking built in",
    body: '"Get started" becomes "demo booked" while the intent is still warm.',
  },
];

export default async function MarketingHomePage() {
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
    <MarketingPageShell>
      <LandingNav crossLink={{ label: "For customer success", href: "/landing-page-2" }} />
      <HeroSection
        h1="Your best leads are already singing."
        subhead="Birdsong invites the people you want to sell to into genuine conversations about their work, then hands your team qualified leads with the whole story already there."
      />
      <ProductDemo content={DEMO_CONTENT} />
      <HowItWorksSection
        heading="From first note to booked demo."
        invite={{
          text: "You pick the audience. Birdsong reaches them directly and invites them into a paid, peer-level conversation about their work.",
        }}
        converse={{
          text: "A real conversation about their work, not a survey. What actually hurts surfaces in their own words, weighed against your ICP and scored.",
          chips: [
            "Pain: manual inbound triage",
            "Timeline: this quarter",
            "Champion: Head of Growth",
          ],
        }}
        deliver={{
          text: "The lead lands qualified and routed to the right rep, with the conversation attached and a demo ready to book.",
          cardTitle: "Coretide",
          cardSubtitle: "Qualified · routed to Sam",
          cardPill: "92 fit",
        }}
      />
      <FeaturesSection heading="Everything your team needs. Nothing it doesn't." features={FEATURES} />
      <FooterCta
        heading="Hear your best leads first."
        subhead="Set up in an afternoon. Better inbound leads within the week."
      />
    </MarketingPageShell>
  );
}
