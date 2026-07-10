import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingNav } from "@/components/MarketingNav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    title: "Recruit respondents",
    description:
      "Invite prospects and customers into research that feels genuine, not another form to abandon halfway through.",
  },
  {
    title: "AI conducts the interview",
    description:
      "A natural, one-question-at-a-time conversation surfaces real friction in the respondent's own words, not a script.",
  },
  {
    title: "Leads routed, content generated",
    description:
      "Every response is scored and handed to your BDR team, and every conversation becomes source material for content.",
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
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative flex flex-col items-center gap-8 overflow-hidden bg-[#0a0a0a] px-6 pb-32 pt-28 text-center">
        {/* subtle grid background */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative flex flex-col items-center gap-4">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            AI-moderated research that converts
          </span>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Survey it. Score it.<br />
            <span className="text-white/50">Pipeline it.</span>
          </h1>
          <p className="max-w-xl text-lg text-white/50 leading-relaxed">
            AI-moderated industry surveys that uncover buyer pain points, deliver qualified inbound
            leads to your BDR team, and turn every respondent into thought leadership content.
          </p>
          <div className="mt-2 flex gap-3">
            <Button asChild size="lg" className="rounded-full bg-white px-8 text-[#0a0a0a] hover:bg-white/90">
              <Link href="/admin/signup">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto flex max-w-5xl flex-col gap-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How it works</span>
            <h2 className="text-3xl font-bold tracking-tight text-[#0a0a0a]">Three steps from cold prospect to qualified lead</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a0a0a] text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different */}
      <section className="bg-[#f8f8f7] px-6 py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">The difference</span>
          <h2 className="text-3xl font-bold tracking-tight text-[#0a0a0a]">
            Research, content, and pipeline from one conversation
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Research tools stop at research. Content tools stop at content. Birdsong is the only
            platform that connects respondent conversations directly to your BDR pipeline, so
            every interview does triple duty: insight, content, and a scored, routed lead.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-6 text-left w-full">
            {[
              { label: "Qualified leads/month", value: "100+" },
              { label: "Minutes per interview", value: "~8" },
              { label: "Content pieces per survey", value: "3–5" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 rounded-2xl border border-[#e5e7eb] bg-white p-6">
                <span className="text-3xl font-bold text-[#0a0a0a]">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0a0a0a] px-6 py-24 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
          <h2 className="text-3xl font-bold text-white">
            Turn your next survey into pipeline
          </h2>
          <p className="text-base text-white/50">No credit card required. Set up your first survey in minutes.</p>
          <Button asChild size="lg" className="rounded-full bg-white px-10 text-[#0a0a0a] hover:bg-white/90">
            <Link href="/admin/signup">Get started free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-[#e5e7eb] bg-white px-6 py-6 text-center text-xs text-muted-foreground">
        © 2026 Birdsong. AI-moderated survey platform for B2B demand gen.
      </footer>
    </div>
  );
}
