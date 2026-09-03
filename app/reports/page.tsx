import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/marketing/LandingPageShell";
import { LandingNav } from "@/components/marketing/LandingNav";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { Eyebrow } from "@/components/research/ReportBlocks";
import { ReportCard } from "@/components/research/ReportCard";
import { listPublicReports, sponsorsOf } from "@/lib/reports/public";
import { siteUrl } from "@/lib/reports/site";

export const revalidate = 3600;

const TITLE = "Research · Birdsong";
const DESCRIPTION =
  "Published studies from Birdsong interviews. Every finding traceable to a named number of in-depth conversations with people doing the work.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${siteUrl()}/reports` },
  openGraph: {
    type: "website",
    url: `${siteUrl()}/reports`,
    siteName: "Birdsong",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

/**
 * The library index.
 *
 * Filtering is a set of links carrying ?sponsor=, applied on the server,
 * rather than client state: at this volume the whole list is already in the
 * HTML, and a link keeps each filtered view addressable, shareable and
 * crawlable. Topic is not offered as a second filter because surveys.topic
 * is a free-text sentence describing the study's brief, not a taxonomy term,
 * so it has no repeated values to group by. See the report.
 */
export default async function ReportsIndex({
  searchParams,
}: {
  searchParams: Promise<{ sponsor?: string }>;
}) {
  const { sponsor: sponsorFilter } = await searchParams;
  const all = await listPublicReports();
  const sponsors = sponsorsOf(all);
  const active = sponsorFilter && sponsors.includes(sponsorFilter) ? sponsorFilter : null;
  const reports = active ? all.filter((r) => r.sponsor === active) : all;

  return (
    <LandingPageShell>
      <LandingNav crossLink={{ label: "Home", href: "/" }} homeHref="/" variant="minimal" />

      <header className="mx-auto max-w-[1480px] px-6 pb-12 pt-16 md:px-10">
        <Eyebrow>BIRDSONG RESEARCH</Eyebrow>
        <h1 className="m-0 mt-5 max-w-[20ch] text-balance font-bricolage text-[clamp(38px,4.4vw,62px)] font-bold leading-[1.04] tracking-[-0.025em]">
          What the field actually{" "}
          <span className="font-normal italic text-landing-green">says.</span>
        </h1>
        <p className="m-0 mt-6 max-w-[58ch] text-pretty text-[18.5px] leading-[1.62] text-landing-muted">
          {DESCRIPTION}
        </p>
      </header>

      {sponsors.length > 1 && (
        <div className="mx-auto max-w-[1480px] px-6 pb-10 md:px-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterLink href="/reports" label="All studies" active={!active} />
            {sponsors.map((s) => (
              <FilterLink
                key={s}
                href={`/reports?sponsor=${encodeURIComponent(s)}`}
                label={s}
                active={active === s}
              />
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1480px] px-6 pb-24 md:px-10">
        {reports.length === 0 ? (
          <p className="m-0 max-w-[52ch] text-[17px] leading-[1.6] text-landing-muted">
            No studies have published yet. The first ones are being written up now.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-7 lp-stack:grid-cols-2 lp-mobile:grid-cols-1">
            {reports.map((report) => (
              <ReportCard key={report.slug} report={report} />
            ))}
          </div>
        )}
      </main>

      <LandingFooter
        description="Birdsong runs paid, in-depth interviews and publishes what the field says."
        crossLink={{ label: "Home", href: "/" }}
        variant="minimal"
      />
    </LandingPageShell>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border-2 px-[18px] py-2 text-[14.5px] font-medium no-underline transition-colors ${
        active
          ? "border-landing-ink bg-landing-ink text-landing-bg"
          : "border-landing-border bg-landing-surface text-landing-muted hover:border-landing-faint"
      }`}
    >
      {label}
    </Link>
  );
}
