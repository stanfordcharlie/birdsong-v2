import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <MarketingNav />

      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold text-card-foreground sm:text-4xl">Birdsong</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          AI-moderated industry surveys that uncover buyer pain points, deliver qualified inbound
          leads to your BDR team, and turn every respondent into thought leadership content.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/admin/signup">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/admin/login">Log In</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <h2 className="text-center text-2xl font-semibold text-card-foreground">How it works</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title}>
                <CardHeader>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <CardTitle className="pt-2">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why it's different */}
      <section className="bg-sidebar px-6 py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold text-sidebar-active-foreground">
            Research, content, and pipeline, from one conversation
          </h2>
          <p className="text-sidebar-foreground">
            Research tools stop at research. Content tools stop at content. Birdsong is the only
            platform that connects respondent conversations directly to your BDR pipeline, so
            every interview does triple duty: insight, content, and a scored, routed lead.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="flex flex-col items-center gap-6 px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold text-card-foreground">
          Turn your next survey into pipeline
        </h2>
        <Button asChild size="lg">
          <Link href="/admin/signup">Get Started</Link>
        </Button>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Birdsong — AI-moderated survey platform for B2B demand gen.
      </footer>
    </div>
  );
}
