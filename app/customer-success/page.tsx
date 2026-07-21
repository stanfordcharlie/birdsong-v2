import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { LandingNav } from "@/components/marketing/LandingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProductDemo, type ProductDemoContent } from "@/components/marketing/ProductDemo";
import { HowItWorksShowcase } from "@/components/marketing/HowItWorksShowcase";
import { AskedNotInferredGrid } from "@/components/marketing/AskedNotInferredGrid";
import { FooterCta } from "@/components/marketing/FooterCta";

export const metadata: Metadata = {
  title: "Birdsong — Hear the customers you never get to.",
  description:
    "Past your top accounts, most of your base never gets a real conversation. Birdsong invites them into one, and hands your team the expansion opportunities it surfaces, with the whole story already there.",
};

const DEMO_CONTENT: ProductDemoContent = {
  sessionSubtitle: "Operations tooling in practice · 15 min · once a year · paid session",
  questionProgressLabel: "Question 3 of 7",
  joiningLine: "Priya accepted the invite · joining the session…",
  question: "How has the way your team uses its ops tooling changed over the past year?",
  answer:
    "Honestly, we've doubled the team on it, and two other departments keep asking for seats. We've been working around the limits of our plan for months.",
  doneLabel: "Conversation complete · 14 min",
  teamLabel: "Delivered to your CS team",
  avatarInitials: "PN",
  personName: "Priya Nair",
  personMeta: "Ops Lead · Fernwood Labs · customer for 2 years",
  conversationMeta: "Conversation complete · 7 questions · 14 min",
  extractedChip: "Expansion signal: two more departments asking for seats",
  scoreFieldLabel: "Expansion score",
  qualifiedScoreWidth: "88%",
  qualifiedScoreLabel: "88, strong",
  qualifiedBadgeLabel: "Expansion ready",
  ctaButtonLabel: "Route to account owner",
  successLine: "Routed to Dana (CSM, Fernwood) with the full conversation",
};

export default async function ExpansionMarketingPage() {
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
      <LandingNav crossLink={{ label: "For Inbound leads", href: "/" }} />
      <HeroSection
        eyebrow="Birdsong for customer success"
        h1="Hear the customers you never get to."
        subhead="Past your top accounts, most of your base never gets a real conversation. Birdsong invites them into one, and hands your team the expansion opportunities it surfaces, with the whole story already there."
        subheadMaxWidth={580}
      />
      <ProductDemo content={DEMO_CONTENT} />
      <HowItWorksShowcase
        content={{
          headline: "A real conversation for every account, not just the top fifteen.",
          headlineMaxWidth: 720,
          headlineSizeClass: "text-[clamp(36px,4.2vw,50px)] leading-[1.1]",
          kicker:
            "Three steps, one owner: Birdsong. Your CSMs only show up for accounts ready to grow.",
          invite: {
            chipA: "Fernwood Labs · invited",
            chipB: "Priya · accepted",
            body: "Your long tail gets usage dashboards, not conversations. Birdsong invites those customers into one: occasional, paid, and worth their time.",
          },
          converse: {
            question: "How has the team's use changed this year?",
            answer: "We doubled — two more departments want in.",
            chips: ["Growth: team doubled", "Appetite: two departments"],
            body: "The research stands apart from the relationship, so nobody has to probe. Growth, friction, and appetite surface in the customer's own words.",
          },
          deliver: {
            account: "Fernwood Labs",
            badge: "88 fit",
            routedLine: "Expansion ready · routed to Dana",
            footerLine: "Conversation attached · QBRs untouched",
            body: "The opportunity lands with whoever owns the account, scored and sourced, with the conversation attached. QBRs and check-ins stay exactly as they are.",
          },
        }}
      />
      <AskedNotInferredGrid />
      <FooterCta
        heading="Hear your whole base."
        subhead="Runs alongside your NPS tool. Your first expansion signals within the month."
        extraLink={{ label: "Inbound leads", href: "/" }}
      />
    </MarketingPageShell>
  );
}
