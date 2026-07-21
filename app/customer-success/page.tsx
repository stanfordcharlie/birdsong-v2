import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPageShell } from "@/components/marketing/LandingPageShell";
import { LandingNav } from "@/components/marketing/LandingNav";
import { Hero } from "@/components/marketing/Hero";
import { NotationDivider } from "@/components/marketing/NotationDivider";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { HowItWorksStep } from "@/components/marketing/HowItWorksStep";
import { InviteGraphic } from "@/components/marketing/InviteGraphic";
import { ListenGraphic } from "@/components/marketing/ListenGraphic";
import { RouteGraphic } from "@/components/marketing/RouteGraphic";
import { ProofComparison } from "@/components/marketing/ProofComparison";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { CrossAudienceBanner } from "@/components/marketing/CrossAudienceBanner";
import { LandingCta } from "@/components/marketing/LandingCta";
import { LandingFooter } from "@/components/marketing/LandingFooter";

const TITLE = "Birdsong · Your happiest customers have more to say.";
const DESCRIPTION =
  "Birdsong runs genuine research conversations across your whole customer base, then hands your team expansion signals with the full story attached.";

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

export default async function CustomerSuccessPage() {
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
    <LandingPageShell tone="eggshell">
      <LandingNav crossLink={{ label: "For Demand Gen", href: "/" }} />
      <Hero
        h1Pre="Your happiest customers have"
        h1Colored="more to say."
        h1FontSizePx={58}
        subhead="Birdsong runs genuine research conversations across your whole customer base, then hands your team expansion signals with the full story attached."
        demoContent={{
          headerLabel: "customer conversation",
          question: {
            pre: "A year in:",
            bold: "how has the team's use actually changed",
            post: ", and who else has started asking about it?",
          },
          answer: "We doubled. Design and Data both keep asking when they get seats.",
          chipA: "What would make it easy?",
          chipB: "What almost stopped you?",
        }}
      />
      <NotationDivider />
      <HowItWorksSection
        headline="A real conversation for every account, not just the top fifteen."
        headlineFontSizePx={46}
        headlineLineHeight={1.08}
        headlineMaxWidthPx={720}
        kicker="Three steps, one owner: Birdsong. Your CSMs only show up for accounts ready to grow."
      >
        <HowItWorksStep
          number="01"
          accent="green"
          transitionDelay="0.05s"
          title="Invite"
          body="Your long tail gets usage dashboards, not conversations. Birdsong invites those customers into one: occasional, paid, and worth their time."
        >
          <InviteGraphic
            personaTopInitials="FW"
            personaMidInitials="PR"
            personaBottomInitials="AC"
            chipALabel="Fernwood Labs · invited"
            chipBLabel="Priya · accepted"
          />
        </HowItWorksStep>
        <HowItWorksStep
          number="02"
          accent="blue"
          transitionDelay="0.15s"
          title="Listen"
          body="The research stands apart from the relationship, so nobody has to probe. Growth, friction, and appetite surface in the customer's own words."
        >
          <ListenGraphic
            question="How has the team's use changed this year?"
            answer="We doubled. Two more departments want in."
            chip1Label="Growth: team doubled"
            chip2Label="Appetite: two departments"
          />
        </HowItWorksStep>
        <HowItWorksStep
          number="03"
          accent="butter"
          transitionDelay="0.25s"
          title="Deliver"
          body="The opportunity lands with whoever owns the account, scored and sourced, with the conversation attached. QBRs stay exactly as they are."
        >
          <RouteGraphic
            cardTitle="Fernwood Labs"
            badgeLabel="Expansion 88"
            subline="Ready to grow · routed to Dana"
            footerLine="Conversation attached · QBRs untouched"
            stickerLabel="growing!"
          />
        </HowItWorksStep>
      </HowItWorksSection>
      <ProofComparison
        headlinePre="Every signal arrives with the"
        headlineGreen="whole story."
        intro="Usage data can only guess. This is the difference between a health score and a Birdsong signal."
        leftLabel="A HEALTH SCORE, USUALLY"
        leftInitials="FL"
        leftName="Fernwood Labs"
        leftSubline="Health 72 · fine"
        leftSourceLine="Logins steady · tickets low"
        rightLabel="A BIRDSONG SIGNAL"
        rightName="Priya Raman"
        rightTitleLine="Ops Lead · Fernwood Labs"
        rightScoreLabel="Expansion 88"
        pullQuote="We doubled this year. Design and Data keep asking when they get seats."
        signals={[
          "Growth: team doubled since January",
          "Appetite: two departments named",
          "Friction: SSO setup stalled the last rollout",
        ]}
        calloutLabel="Next step, drafted:"
        calloutText="You mentioned Design and Data want in. Want me to set up a pilot for both before renewal?"
      />
      <section id="features" className="mx-auto max-w-[1360px] px-6 pb-[100px] md:px-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            tint="green"
            title="Conversations, not check-ins"
            body="Customers tell a neutral interviewer things they would never volunteer on a QBR."
          />
          <FeatureCard
            tint="blue"
            transitionDelay="0.1s"
            title="The whole base, heard"
            body="Real conversations for the hundreds of accounts tech touch never reaches, not just the ones with a CSM."
          />
          <FeatureCard
            tint="butter"
            transitionDelay="0.2s"
            title="Expansion, spotted early"
            body="Growth signals land with the account owner months before the renewal call, not during it."
          />
        </div>
      </section>
      <CrossAudienceBanner
        heading="Trying to reach buyers you don't know yet?"
        subtext="Birdsong turns market research into qualified pipeline."
        linkLabel="For Demand Gen"
        href="/"
      />
      <LandingCta headlinePre="Hear what your customers are" headlineBlue="saying." />
      <LandingFooter />
    </LandingPageShell>
  );
}
