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

// This is the primary indexed page for the domain, so metadata here (not
// the generic fallback in app/layout.tsx) is what search/social previews
// actually show for usebirdsong.com.
const TITLE = "Birdsong · Your best leads are already singing.";
const DESCRIPTION =
  "Birdsong runs paid, in-depth interviews with the people you want to reach, then hands your team the qualified ones with the whole conversation attached.";

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
    <LandingPageShell>
      <LandingNav crossLink={{ label: "For customer success", href: "/customer-success" }} />
      <Hero
        eyebrow="INTERVIEW-LED PIPELINE"
        headlinePre="Your best leads are already"
        headlineAccent="singing."
        subhead="Birdsong runs paid, in-depth interviews with the people you want to reach, then hands your team the qualified ones with the whole conversation attached."
        demo={{
          headerLabel: "Interview 04 · Head of Growth, Coretide",
          question: {
            pre: "Before we get to tools:",
            bold: "where does your pipeline actually come from",
            post: " right now, and which part of it do you trust least?",
          },
          answer: "Honestly? Two channels, and one of them is me answering cold emails at 11pm.",
          followUp: "Tell me about the 11pm part. What happens to those replies the next morning?",
          signals: ["Pain: manual triage", "Buyer: CRO named", "Score: 9 / 10"],
        }}
      />
      <MetricsBand
        items={[
          {
            figure: "22 minutes",
            body: "Median depth of a Birdsong interview, start to finish.",
          },
          {
            figure: "1 to 10",
            body: "Every respondent scored against your ICP, with written reasoning.",
          },
          {
            figure: "7 days",
            body: "From brief to your first scored interview landing in the queue.",
          },
        ]}
      />
      <SequenceSection
        headline="From first note to booked demo"
        intro="Three steps, one owner. Birdsong recruits the audience, runs the interviews and scores the outcome. Your team only shows up for the demo."
        steps={[
          {
            number: "01",
            title: "Invite the right rooms",
            body: "Paid respondents join a genuine industry conversation. You define the audience.",
          },
          {
            number: "02",
            title: "Listen, never pitch",
            body: "Interviews surface how these teams really work, budgets and blockers included.",
          },
          {
            number: "03",
            title: "Hand over the hot ones",
            body: "Hot leads arrive in your queue with the score, the quotes and a call script.",
          },
        ]}
        invite={{
          briefLabel: "AUDIENCE BRIEF",
          brief: "Revenue leaders at 50 to 500 seat B2B software",
          personaTop: "VS",
          personaMid: "HG",
          personaBottom: "PM",
          chipA: "VP Sales · invited",
          chipB: "Head of Growth · accepted",
          stats: ["184 invited", "61 accepted", "Incentive handled by Birdsong"],
        }}
        transcript={{
          label: "TRANSCRIPT · MINUTE 09",
          followUps: "4 follow-ups asked",
          exchange: [
            "What breaks first when inbound spikes?",
            "Triage. Everything sits for days and the good ones go cold.",
            "How many hours a month does that cost you?",
            "Call it forty. My CRO asks about it every week.",
          ],
          tags: ["Pain quantified", "Buyer identified", "Timeline this quarter"],
        }}
        handoff={{
          name: "Sam Okafor",
          title: "Head of Growth · Coretide",
          scoreLabel: "Score 9 / 10",
          quote: "“We spend our best hours triaging inbound that goes nowhere.”",
          facts: [
            { label: "METRIC", value: "40 hours a month lost" },
            { label: "BUYER", value: "CRO, named" },
            { label: "TIMELINE", value: "This quarter" },
          ],
          calloutLabel: "Call opener, generated:",
          calloutText:
            "“You said triage eats your team’s best hours. Walk me through the worst morning, and I’ll show you what we’d take off your plate first.”",
          stickerLabel: "booked!",
        }}
      />
      <QueueSection
        headline="This is what your reps open on Monday"
        intro="Pick a respondent. The score, the reasoning and the opener were all written from what they actually said."
        rows={[
          { name: "Sam Okafor", subtitle: "Head of Growth · Coretide", score: "9" },
          { name: "Priya Raman", subtitle: "VP Sales · Lattice Freight", score: "7" },
          { name: "Daniel Ochoa", subtitle: "RevOps Lead · Northwind", score: "4" },
        ]}
        footnote="3 of 61 interviews shown"
        panels={[
          {
            verdict: "Route to sales today",
            scoreLabel: "Score 9 / 10",
            scoreTone: "green",
            quote: "“We spend our best hours triaging inbound that goes nowhere.”",
            facts: [
              { label: "WHY 9", value: "Named pain, quantified, budget owner in the room" },
              { label: "TIMELINE", value: "Evaluating this quarter" },
              { label: "NEXT STEP", value: "Warm intro accepted" },
            ],
            calloutLabel: "Opener:",
            calloutText:
              "“You said triage eats your team’s best hours. Walk me through the worst morning.”",
          },
          {
            verdict: "Nurture, revisit next quarter",
            scoreLabel: "Score 7 / 10",
            scoreTone: "butter",
            quote:
              "“The problem is real, but we just signed a two year contract elsewhere.”",
            facts: [
              { label: "WHY 7", value: "Strong fit, wrong moment, renewal in March" },
              { label: "TIMELINE", value: "Contract ends Q1" },
              { label: "NEXT STEP", value: "Quarterly check in" },
            ],
            calloutLabel: "Opener:",
            calloutText:
              "“You mentioned the renewal in March. Worth comparing notes before you re-sign?”",
          },
          {
            verdict: "Keep as research, not a lead",
            scoreLabel: "Score 4 / 10",
            scoreTone: "neutral",
            quote: "“We built our own routing last year. It mostly works.”",
            facts: [
              { label: "WHY 4", value: "No active pain, no budget, internal tooling in place" },
              { label: "STILL USEFUL", value: "Told us what “good enough” looks like" },
              { label: "NEXT STEP", value: "None. Nobody calls him." },
            ],
            calloutLabel: "Why this matters:",
            calloutText:
              "a scored no is worth as much as a yes. Your reps never spend a morning on him.",
          },
        ]}
      />
      <ProofSection
        headlinePre="Every lead arrives with the"
        headlineAccent="whole story"
        intro="Two versions of the same person, side by side. One is a name and an email address. The other is a conversation your rep can open with."
        thin={{
          label: "A LEAD, USUALLY",
          initials: "JR",
          name: "Jordan Reyes",
          subtitle: "jordan.reyes@coretide.com",
          sourceLine: "Source: downloaded “State of Inbound.pdf”",
          unknownLine: "Everything else: unknown",
          caption: "A rep guesses the pain, guesses the timing, and opens with a persona.",
        }}
        rich={{
          label: "A BIRDSONG LEAD",
          name: "Sam Okafor",
          title: "Head of Growth · Coretide",
          scoreLabel: "Score 9 / 10",
          quote: "“We spend our best hours triaging inbound that goes nowhere.”",
          facts: [
            { label: "METRIC", value: "40 hours a month lost to manual triage" },
            { label: "ECONOMIC BUYER", value: "CRO, named in the conversation" },
            { label: "TIMELINE", value: "Evaluating this quarter" },
          ],
          calloutLabel: "Call opener, generated:",
          calloutText:
            "“You said triage eats your team’s best hours. Walk me through the worst morning, and I’ll show you what we’d take off your plate first.”",
        }}
      />
      <FaqSection
        headline="Reasonable questions"
        items={[
          {
            question: "Are these real people, or synthetic respondents?",
            answer:
              "Real, verified, and paid for their time. Birdsong recruits them against your brief, confirms role and company, and handles the incentive. The interviewer is ours; the answers are theirs.",
          },
          {
            question: "Does it feel like a sales call to the respondent?",
            answer:
              "No. Nothing is pitched in the interview and your product is never named unless the respondent raises it. That is why the answers are honest enough to sell from later.",
          },
          {
            question: "How is the score actually calculated?",
            answer:
              "Against the ICP you define: pain present and quantified, budget owner identified, timeline, and current tooling. Every score ships with the reasoning and the quotes it came from, so your team can disagree with it.",
          },
          {
            question: "What do I get if nobody turns out to be a buyer?",
            answer:
              "A research report your product team will fight over: how this market works, what they have already tried, what they call the problem, and what they consider good enough. A scored no still saves your reps a morning.",
          },
          {
            question: "How long until interviews are running?",
            answer:
              "About a week. Day one is the brief and the ICP, then recruiting starts. Most teams see their first scored interview inside seven days.",
          },
        ]}
      />
      <CrossAudienceBanner
        heading="Running research on the customers you already have?"
        subtext="Birdsong finds expansion signals, churn risk and reference candidates inside your happiest accounts."
        linkLabel="For customer success"
        href="/customer-success"
      />
      <LandingCta
        headlinePre="Hear what your market is"
        headlineAccent="actually saying"
        subhead="Tell us who you want to reach. We will have interviews running this week."
      />
      <LandingFooter
        description="Interview-led pipeline for teams who would rather hear it first hand."
        crossLink={{ label: "For customer success", href: "/customer-success" }}
      />
    </LandingPageShell>
  );
}
