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

const FEATURES = [
  {
    title: "Beyond the health score",
    body: "Usage data guesses. A conversation hears the two departments asking for seats.",
  },
  {
    title: "Trust, kept intact",
    body: "Your CSMs never have to pitch mid-relationship. The research stands apart, so the relationship stays warm.",
  },
  {
    title: "The whole base, heard",
    body: "Real conversations for the hundreds of accounts tech touch never reaches, not just the ones with a CSM.",
  },
  {
    title: "Paced for people",
    body: "Occasional and meaningful by design. One good conversation a year beats a survey every quarter.",
  },
];

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
    <MarketingPageShell>
      <LandingNav crossLink={{ label: "For Inbound leads", href: "/" }} />
      <HeroSection
        eyebrow="Birdsong for customer success"
        h1="Hear the customers you never get to."
        subhead="Past your top accounts, most of your base never gets a real conversation. Birdsong invites them into one, and hands your team the expansion opportunities it surfaces, with the whole story already there."
        subheadMaxWidth={580}
      />
      <ProductDemo content={DEMO_CONTENT} />
      <HowItWorksSection
        heading="A real conversation for every account, not just the top fifteen."
        headingMaxWidth={560}
        invite={{
          text: "Your long tail gets usage dashboards, not conversations. Birdsong invites those customers into one: occasional, paid, and worth their time.",
        }}
        converse={{
          text: "The research stands apart from the relationship, so nobody has to probe. Growth, friction, and appetite surface in the customer's own words.",
          chips: [
            "Growth: team doubled this year",
            "Appetite: two departments want in",
            "Friction: working around plan limits",
          ],
        }}
        converseChipsMaxWidth={240}
        deliver={{
          text: "The opportunity lands with whoever owns the account, scored and sourced, with the conversation attached. QBRs and check-ins stay exactly as they are.",
          cardTitle: "Fernwood Labs",
          cardSubtitle: "Expansion ready · routed to Dana",
          cardPill: "88 fit",
        }}
      />
      <FeaturesSection heading="Asked, not inferred." features={FEATURES} />
      <FooterCta
        heading="Hear your whole base."
        subhead="Runs alongside your NPS tool. Your first expansion signals within the month."
        extraLink={{ label: "Inbound leads", href: "/" }}
      />
    </MarketingPageShell>
  );
}
