import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPageShell } from "@/components/marketing/LandingPageShell";
import { LandingNav } from "@/components/marketing/LandingNav";
import { Hero } from "@/components/marketing/Hero";
import { MetricsBand } from "@/components/marketing/MetricsBand";
import { SequenceSection } from "@/components/marketing/SequenceSection";
import { QueueSection } from "@/components/marketing/QueueSection";
import { ProofSection } from "@/components/marketing/ProofSection";
import { FaqSection } from "@/components/marketing/FaqSection";
import { CrossAudienceBanner } from "@/components/marketing/CrossAudienceBanner";
import { LandingCta } from "@/components/marketing/LandingCta";
import { LandingFooter } from "@/components/marketing/LandingFooter";

const TITLE = "Birdsong · Your happiest customers have more to say.";
const DESCRIPTION =
  "Birdsong runs paid research conversations across your whole customer base, then hands the account owner the expansion signals with the conversation attached.";

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
    <LandingPageShell>
      <LandingNav crossLink={{ label: "For demand gen", href: "/" }} />
      <Hero
        eyebrow="RESEARCH-LED EXPANSION"
        headlinePre="Your happiest customers have"
        headlineAccent="more to say."
        accentUnderlineWidth={300}
        subhead="Birdsong runs paid research conversations across your whole customer base, then hands the account owner the expansion signals with the conversation attached."
        trustPoints={[
          "Your whole base, not the top fifteen",
          "QBRs stay exactly as they are",
          "Live in about a week",
        ]}
        demo={{
          headerLabel: "Conversation 12 · Ops Lead, Fernwood Labs",
          headerMinute: "Minute 14 of 26",
          question: {
            pre: "A year in:",
            bold: "how has the team’s use actually changed",
            post: ", and who else has started asking about it?",
          },
          answer: "We doubled. Design and Data both keep asking when they get seats.",
          followUp: "What stopped you adding them already?",
          signals: ["Growth: team doubled", "Appetite: two departments", "Expansion 88"],
        }}
      />
      <MetricsBand
        items={[
          {
            figure: "26 minutes",
            body: "Median depth of a Birdsong customer conversation.",
          },
          {
            figure: "Every account",
            body: "Heard on a real call, including the hundreds no CSM covers.",
          },
          {
            figure: "7 days",
            body: "From brief to your first scored signal landing with the owner.",
          },
        ]}
      />
      <SequenceSection
        headline="A real conversation for every account"
        intro="Three steps, one owner. Birdsong invites the accounts, runs the research and scores the outcome. Your CSMs only show up where there is something to grow."
        steps={[
          {
            number: "01",
            title: "Invite the whole base",
            body: "Occasional, paid conversations for the accounts your team never gets to.",
          },
          {
            number: "02",
            title: "Listen apart from the relationship",
            body: "Growth, friction and appetite surface without a CSM having to probe.",
          },
          {
            number: "03",
            title: "Route the ready ones",
            body: "Signals land with the account owner, scored, sourced and quotable.",
          },
        ]}
        invite={{
          briefLabel: "ACCOUNT BRIEF",
          brief: "Every account under 200 seats, once a quarter",
          personaTop: "AC",
          personaMid: "FW",
          personaBottom: "MH",
          chipA: "Alder & Co · invited",
          chipB: "Fernwood Labs · accepted",
          stats: ["412 accounts invited", "147 conversations", "Incentive handled by Birdsong"],
        }}
        transcript={{
          label: "TRANSCRIPT · MINUTE 14",
          followUps: "5 follow-ups asked",
          exchange: [
            "How has the team’s use changed this year?",
            "We doubled. Two more departments want in.",
            "What stopped you adding them already?",
            "SSO setup stalled the last rollout. Nobody wanted to redo that.",
          ],
          tags: ["Growth quantified", "Appetite named", "Friction surfaced"],
        }}
        handoff={{
          name: "Fernwood Labs",
          title: "Priya Raman · Ops Lead",
          scoreLabel: "Expansion 88",
          quote: "“We doubled this year. Design and Data keep asking when they get seats.”",
          facts: [
            { label: "GROWTH", value: "Team doubled" },
            { label: "APPETITE", value: "Two departments" },
            { label: "TIMELINE", value: "Before renewal" },
          ],
          calloutLabel: "Next step, drafted:",
          calloutText:
            "“You mentioned Design and Data want in. Want me to set up a pilot for both before renewal?”",
          stickerLabel: "growing!",
        }}
      />
      <QueueSection
        headline="This is what your CSMs open on Monday"
        intro="Pick an account. The score, the reasoning and the next step were all written from what the customer actually said."
        rows={[
          { name: "Fernwood Labs", subtitle: "Priya Raman · Ops Lead", score: "88" },
          { name: "Alder & Co", subtitle: "Tom Alderman · Support Manager", score: "54" },
          { name: "Marrowick Health", subtitle: "Dana Kohl · Head of Ops", score: "22" },
        ]}
        footnote="3 of 147 conversations shown"
        panels={[
          {
            verdict: "Open the expansion conversation",
            scoreLabel: "Expansion 88",
            scoreTone: "green",
            quote: "“We doubled this year. Design and Data keep asking when they get seats.”",
            facts: [
              { label: "WHY 88", value: "Growth quantified, two departments asking by name" },
              { label: "TIMELINE", value: "Seats wanted before the new year" },
              { label: "NEXT STEP", value: "Pilot for both teams, pre-renewal" },
            ],
            calloutLabel: "Opener:",
            calloutText:
              "“You mentioned Design and Data want in. Want me to set that up before renewal?”",
          },
          {
            verdict: "Healthy, revisit at renewal",
            scoreLabel: "Expansion 54",
            scoreTone: "butter",
            quote: "“It does what we need. I would not know what else to buy from you.”",
            facts: [
              { label: "WHY 54", value: "Satisfied and stable, no unmet need surfaced" },
              { label: "STILL USEFUL", value: "Named two features they never found" },
              { label: "NEXT STEP", value: "Reference candidate, not an upsell" },
            ],
            calloutLabel: "Opener:",
            calloutText:
              "“You said reporting still lives in a spreadsheet. Ten minutes to show you where it moved?”",
          },
          {
            verdict: "Fix the friction before renewal",
            scoreLabel: "Expansion 22",
            scoreTone: "neutral",
            quote: "“Two of the three people who set this up have left. Nobody owns it now.”",
            facts: [
              { label: "WHY 22", value: "No internal owner, usage drifting, health score still green" },
              { label: "RISK", value: "Renewal in five months" },
              { label: "NEXT STEP", value: "Re-onboard the new team, no upsell" },
            ],
            calloutLabel: "Why this matters:",
            calloutText:
              "the dashboard called this account healthy. The conversation caught it five months early.",
          },
        ]}
      />
      <ProofSection
        headlinePre="Every signal arrives with the"
        headlineAccent="whole story"
        intro="Two versions of the same account, side by side. One is a number that says fine. The other is a conversation your CSM can act on."
        thin={{
          label: "A HEALTH SCORE, USUALLY",
          initials: "FL",
          name: "Fernwood Labs",
          subtitle: "Health 72 · fine",
          sourceLine: "Logins steady · tickets low",
          unknownLine: "Everything else: unknown",
          caption: "A CSM guesses the appetite, guesses the timing, and opens with a check-in.",
        }}
        rich={{
          label: "A BIRDSONG SIGNAL",
          name: "Priya Raman",
          title: "Ops Lead · Fernwood Labs",
          scoreLabel: "Expansion 88",
          quote: "“We doubled this year. Design and Data keep asking when they get seats.”",
          facts: [
            { label: "GROWTH", value: "Team doubled since January" },
            { label: "APPETITE", value: "Design and Data named, seats wanted" },
            { label: "FRICTION", value: "SSO setup stalled the last rollout" },
          ],
          calloutLabel: "Next step, drafted:",
          calloutText:
            "“You mentioned Design and Data want in, and that SSO stalled you last time. Want me to run the pilot setup for both before renewal?”",
        }}
      />
      <FaqSection
        headline="Reasonable questions"
        items={[
          {
            question: "Does this cut across what my CSMs already do?",
            answer:
              "No. QBRs, check-ins and the relationship stay exactly as they are. Birdsong covers the conversations nobody has time for and routes anything worth acting on to whoever owns the account.",
          },
          {
            question: "Do customers know the research is for us?",
            answer:
              "Yes, and that is the point. It is introduced as research on your behalf, run by a neutral interviewer, and nothing is sold in the call. That is why people say the thing they would never say to their CSM.",
          },
          {
            question: "How is the expansion score calculated?",
            answer:
              "Growth in the account, stated appetite for more, friction blocking it, and who holds the budget. Every score ships with the reasoning and the quotes behind it, so your team can disagree with it.",
          },
          {
            question: "What about accounts with no CSM at all?",
            answer:
              "Those are the ones this changes most. Tech touch accounts get a real conversation once a quarter, and the ones showing appetite get promoted into a human queue instead of waiting for a renewal date.",
          },
          {
            question: "How long until conversations are running?",
            answer:
              "About a week. Day one is the brief and the account list, then invitations go out. Most teams see their first scored signal inside seven days.",
          },
        ]}
      />
      <CrossAudienceBanner
        heading="Trying to reach buyers you do not know yet?"
        subtext="Birdsong turns interview-led market research into qualified pipeline for your demand gen team."
        linkLabel="For demand gen"
        href="/"
      />
      <LandingCta
        headlinePre="Hear what your customers are"
        headlineAccent="actually saying"
        subhead="Send us your account list. We will have conversations running this week."
      />
      <LandingFooter
        description="Research-led expansion for teams who would rather hear it first hand."
        crossLink={{ label: "For demand gen", href: "/" }}
      />
    </LandingPageShell>
  );
}
