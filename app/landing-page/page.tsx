import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { LandingNav } from "@/components/marketing/LandingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProductDemo, type ProductDemoContent } from "@/components/marketing/ProductDemo";
import { HowItWorksShowcase } from "@/components/marketing/HowItWorksShowcase";
import { TeamNeedsGrid } from "@/components/marketing/TeamNeedsGrid";
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
  successLine: "Demo booked: Thursday 10:30 AM with Maya (AE, West)",
};

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
    <MarketingPageShell tone="eggshell">
      <LandingNav crossLink={{ label: "For customer success", href: "/landing-page-2" }} />
      <HeroSection
        h1="Your best leads are already singing."
        subhead="Birdsong invites the people you want to sell to into genuine conversations about their work, then hands your team qualified leads with the whole story already there."
      />
      <ProductDemo content={DEMO_CONTENT} />
      <HowItWorksShowcase
        content={{
          headline: "From first note to booked demo.",
          headlineMaxWidth: 640,
          headlineSizeClass: "text-[clamp(38px,4.5vw,54px)] leading-[1.08]",
          kicker: "Three steps, one owner: Birdsong. Your team only shows up for the demo.",
          invite: {
            chipA: "VP Sales · invited",
            chipB: "Head of Growth · accepted",
            body: "You pick the audience. Birdsong reaches them directly and invites them into a paid, peer-level conversation about their work.",
          },
          converse: {
            question: "Where does inbound break down for you today?",
            answer: "Manual triage. Everything sits for days.",
            chips: ["Pain: manual inbound triage", "Timeline: this quarter"],
            body: "A real conversation about their work, not a survey. What actually hurts surfaces in their own words, weighed against your ICP and scored.",
          },
          deliver: {
            account: "Coretide",
            badge: "92 fit",
            routedLine: "Qualified · routed to Maya",
            footerLine: "Demo · Thu 2:30 PM · conversation attached",
            body: "The lead lands qualified and routed to the right rep, with the conversation attached and a demo ready to book.",
          },
        }}
      />
      <TeamNeedsGrid />
      <FooterCta
        heading="Hear your best leads first."
        subhead="Set up in an afternoon. Better inbound leads within the week."
      />
    </MarketingPageShell>
  );
}
