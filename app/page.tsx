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

// This is the primary indexed page for the domain, so metadata here (not
// the generic fallback in app/layout.tsx) is what search/social previews
// actually show for usebirdsong.com.
const TITLE = "Birdsong · Your best leads are already singing.";
const DESCRIPTION =
  "Birdsong holds real conversations with the people you want to reach, then hands your team qualified leads, whole story attached.";

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

export default async function RootPage() {
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
    <LandingPageShell tone="cream">
      <LandingNav crossLink={{ label: "For customer success", href: "/customer-success" }} />
      <Hero
        h1Pre="Your best leads are already"
        h1Colored="singing."
        h1FontSizePx={62}
        subhead="Birdsong holds real conversations with the people you want to reach, then hands your team qualified leads, whole story attached."
        demoContent={{
          headerLabel: "live interview",
          question: {
            pre: "Before we get to tools:",
            bold: "where does your pipeline actually come from",
            post: "right now, and which part of it do you trust least?",
          },
          answer: "Honestly? Two channels, and one of them is me answering cold emails at 11pm.",
          chipA: "Tell me about the 11pm part",
          chipB: "What have you already tried?",
        }}
      />
      <NotationDivider />
      <HowItWorksSection
        headline="From first note to booked demo."
        headlineFontSizePx={48}
        headlineLineHeight={1.06}
        headlineMaxWidthPx={640}
        kicker="Three steps, one owner: Birdsong. Your team only shows up for the demo."
      >
        <HowItWorksStep
          number="01"
          accent="green"
          transitionDelay="0.05s"
          title="Invite"
          body="Paid respondents join a genuine industry conversation. You pick the audience; Birdsong brings them in."
        >
          <InviteGraphic
            personaTopInitials="VS"
            personaMidInitials="HG"
            personaBottomInitials="PM"
            chipALabel="VP Sales · invited"
            chipBLabel="Head of Growth · accepted"
          />
        </HowItWorksStep>
        <HowItWorksStep
          number="02"
          accent="blue"
          transitionDelay="0.15s"
          title="Listen"
          body="AI interviews surface how they actually work, pains included. No pitching, ever."
        >
          <ListenGraphic
            question="What breaks first when inbound spikes?"
            answer="Triage. Everything sits for days."
            chip1Label="Pain: manual triage"
            chip2Label="Timeline: this quarter"
          />
        </HowItWorksStep>
        <HowItWorksStep
          number="03"
          accent="butter"
          transitionDelay="0.25s"
          title="Route"
          body="Each respondent is scored 1 to 10. Hot leads land in your queue with a call script and the context already written."
        >
          <RouteGraphic
            cardTitle="Sam Okafor"
            badgeLabel="9 / 10"
            subline="Hot lead · routed to your queue"
            footerLine="Call script · context attached"
            stickerLabel="booked!"
          />
        </HowItWorksStep>
      </HowItWorksSection>
      <ProofComparison
        headlinePre="Every lead arrives with the"
        headlineGreen="whole story."
        intro="We are early, so no logo wall. Judge the artifact instead: this is the difference between a lead and a Birdsong lead."
        leftLabel="A LEAD, USUALLY"
        leftInitials="JR"
        leftName="Jordan Reyes"
        leftSubline="jordan.reyes@coretide.com"
        leftSourceLine='Source: downloaded "State of Inbound.pdf"'
        rightLabel="A BIRDSONG LEAD"
        rightName="Sam Okafor"
        rightTitleLine="Head of Growth · Coretide"
        rightScoreLabel="Score 9"
        pullQuote="We spend our best hours triaging inbound that goes nowhere."
        signals={[
          "Metric: 40 hours a month lost to manual triage",
          "Economic buyer: CRO, named in conversation",
          "Timeline: evaluating this quarter",
        ]}
        calloutLabel="Call opener, generated:"
        calloutText="You said triage eats your team’s best hours. Walk me through the worst morning, and I’ll show you what we’d take off your plate first."
      />
      <section id="features" className="mx-auto max-w-[1360px] px-6 pb-[100px] md:px-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            tint="green"
            title="Conversations, not forms"
            body="People give twenty honest minutes to a good conversation. They give ninety distracted seconds to a form."
          />
          <FeatureCard
            tint="blue"
            transitionDelay="0.1s"
            title="Scored while you sleep"
            body="Every interview is scored against your ICP overnight, 1 to 10, with the reasoning written out in plain language."
          />
          <FeatureCard
            tint="butter"
            transitionDelay="0.2s"
            title="Scripts from what they said"
            body="Your rep opens the call quoting the prospect’s own words, not a persona guess."
          />
        </div>
      </section>
      <CrossAudienceBanner
        heading="Running customer research on your own base?"
        subtext="Birdsong finds expansion signals in your happiest customers."
        linkLabel="For customer success"
        href="/customer-success"
      />
      <LandingCta headlinePre="Hear what your market is" headlineBlue="saying." />
      <LandingFooter />
    </LandingPageShell>
  );
}
