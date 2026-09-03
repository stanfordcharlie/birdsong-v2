import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPageShell } from "@/components/marketing/LandingPageShell";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { PainPointChart } from "@/components/research/PainPointChart";
import {
  Kicker,
  KeyFindings,
  MoreResearch,
  QuoteGrid,
  ReportSectionHeading,
  SponsorMark,
  TableOfContents,
  ThemeCard,
} from "@/components/research/ReportBlocks";
import { ReportNav } from "@/components/research/ReportNav";
import { ReportStats } from "@/components/research/ReportStats";
import { StudyProfile, type ProfileRow } from "@/components/research/StudyProfile";
import { SubscribeBlock } from "@/components/research/SubscribeBlock";
import { getPublicReport, listPublicReports } from "@/lib/reports/public";
import { painPointChart, reportSection, reportSections, reportStats } from "@/lib/reports/chart-data";
import { formatPublishDate, formatPublishMonth, isoDate } from "@/lib/reports/format";
import { siteUrl } from "@/lib/reports/site";

// Statically generated at build, then revalidated hourly so a study
// published from the admin toggle appears without a redeploy. The publish
// route also revalidates this path directly, so the hour is a backstop
// rather than the mechanism.
export const revalidate = 3600;

// A slug published after the last build is not in generateStaticParams, so
// it must be allowed to render on demand rather than 404; an unknown slug
// still has to 404, which getPublicReport handles.
export const dynamicParams = true;

export async function generateStaticParams() {
  const reports = await listPublicReports();
  return reports.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = await getPublicReport(slug);
  if (!report) return { title: "Research not found · Birdsong" };

  const url = `${siteUrl()}/reports/${report.slug}`;
  return {
    title: `${report.title} · Birdsong Research`,
    description: report.dek,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "Birdsong",
      title: report.title,
      description: report.dek,
      publishedTime: report.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: report.title,
      description: report.dek,
    },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = await getPublicReport(slug);

  // A report that is published to its customer but not publish_public is
  // unreadable by the anon credentials this page holds, so it arrives here
  // as null and 404s whole. There is no partial render path.
  if (!report) notFound();

  const { content } = report;
  const sections = reportSections(content);
  const chart = painPointChart(content, report.respondentCount);
  const stats = reportStats(content, report.respondentCount);

  const all = await listPublicReports();
  const others = all.filter((r) => r.slug !== report.slug).slice(0, 3);
  // Numbered from the oldest published report, so a number never changes
  // once a report has one.
  const position = all.findIndex((r) => r.slug === report.slug);
  const reportNumber = String(position === -1 ? all.length + 1 : all.length - position).padStart(2, "0");

  const profileRows: ProfileRow[] = [
    { label: "Interviews", value: String(report.respondentCount) },
    ...(content.meta && content.meta.interviews_included < content.meta.interviews_total
      ? [{ label: "In this analysis", value: String(content.meta.interviews_included) }]
      : []),
    { label: "Published", value: formatPublishDate(report.publishedAt) },
    ...(report.roles ? [{ label: "Roles", value: report.roles }] : []),
    ...(report.companySize ? [{ label: "Company size", value: report.companySize }] : []),
    { label: "Coded themes", value: String(content.key_themes?.length ?? 0) },
    ...(chart ? [{ label: "Issues counted", value: String((content.pain_point_frequency ?? []).length) }] : []),
  ];

  const railFooter = (
    <>
      Birdsong Research · Report {reportNumber}
      <br />
      Published {formatPublishDate(report.publishedAt)}
    </>
  );

  // schema.org Report. datePublished, publisher and the methodology as
  // description are the fields the brief calls for; isPartOf ties every
  // report to the library so the collection is discoverable as one thing.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: report.title,
    name: report.title,
    description: report.methodology,
    abstract: report.dek,
    datePublished: isoDate(report.publishedAt),
    inLanguage: "en",
    url: `${siteUrl()}/reports/${report.slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl()}/reports/${report.slug}` },
    publisher: {
      "@type": "Organization",
      name: "Birdsong",
      url: siteUrl(),
    },
    ...(report.sponsor ? { sponsor: { "@type": "Organization", name: report.sponsor } } : {}),
    isPartOf: {
      "@type": "CollectionPage",
      name: "Birdsong Research",
      url: `${siteUrl()}/reports`,
    },
  };

  const summarySection = reportSection(sections, "summary")!;
  const findingsSection = reportSection(sections, "key-findings");
  const frequencySection = reportSection(sections, "frequency");
  const themesSection = reportSection(sections, "themes");
  const quotesSection = reportSection(sections, "in-their-words");
  const methodologySection = reportSection(sections, "methodology")!;

  return (
    <LandingPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReportNav />

      {/* Hero: the report on the left, the study profile on the right. */}
      <header className="mx-auto grid max-w-[1480px] grid-cols-[minmax(0,1fr)_420px] items-start gap-16 px-6 pb-16 pt-20 md:px-10 lp-stack:grid-cols-1 lp-stack:gap-10 lp-stack:pt-12">
        <div className="max-w-[760px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-full bg-landing-sunk px-4 py-2 font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-landing-ink">
              Report {reportNumber}
            </span>
            <span className="font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-landing-muted">
              {report.sponsor ?? "Birdsong research"}
              <span className="mx-3" aria-hidden />
              {formatPublishMonth(report.publishedAt)}
            </span>
          </div>
          <h1 className="m-0 mt-8 text-balance font-bricolage text-[clamp(44px,5.6vw,80px)] font-bold leading-[0.98] tracking-[-0.04em] text-landing-ink">
            {report.title}
          </h1>
          <p className="m-0 mt-8 max-w-[56ch] text-pretty font-spectral text-[clamp(21px,2vw,27px)] leading-[1.45] text-landing-ink">
            {report.dek}
          </p>
          <p className="m-0 mt-6 max-w-[62ch] text-[17.5px] leading-[1.65] text-landing-ink-soft">
            {report.methodology}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={`#${findingsSection?.id ?? summarySection.id}`}
              className="lp-hard-cta inline-flex items-center gap-3 rounded-full border-2 border-landing-ink bg-landing-green-deep px-7 py-4 text-[17px] font-bold text-landing-bg no-underline shadow-[4px_4px_0_var(--lp-ink)]"
            >
              Read the findings
              <span aria-hidden>&rarr;</span>
            </a>
            <a
              href="#methodology"
              className="lp-hard-cta inline-flex items-center rounded-full border-2 border-landing-ink bg-landing-surface px-7 py-4 text-[17px] font-bold text-landing-ink no-underline shadow-[4px_4px_0_var(--lp-ink)]"
            >
              Methodology
            </a>
          </div>
        </div>

        <StudyProfile rows={profileRows} headline={report.headline} />
      </header>

      <ReportStats stats={stats} />

      {/* Body. The contents rail is a real sibling column at xl and above;
          below that it collapses to the <details> inside TableOfContents and
          the article takes the full measure. */}
      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-20 px-6 pb-28 pt-20 md:px-10 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="max-w-[900px]">
          <div className="xl:hidden">
            <TableOfContents sections={sections} variant="collapsed" />
          </div>

          <section id="summary" className="scroll-mt-32">
            <ReportSectionHeading
              section={summarySection}
              title={`What ${numberWord(report.respondentCount).toLowerCase()} interviews found`}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-10 lp-stack:grid-cols-1 lp-stack:gap-6">
              <p className="m-0 font-spectral text-[22px] leading-[1.55] text-landing-ink">
                {content.executive_summary}
              </p>
              {/* The one counted figure, pulled out beside the prose. */}
              {report.headline && (
                <aside className="rounded-2xl bg-landing-green-deep px-8 py-8 text-landing-bg">
                  <div className="font-bricolage text-[56px] font-bold leading-none tracking-[-0.04em]">
                    {report.headline.percent}
                  </div>
                  <div className="mt-4 text-[17px] leading-[1.5] opacity-90">
                    of respondents raised {report.headline.label.replace(/\.+$/, "").replace(/^./, (c) => c.toLowerCase())}
                  </div>
                </aside>
              )}
            </div>
          </section>

          {findingsSection && (
            <section id="key-findings" className="scroll-mt-32 pt-24">
              <ReportSectionHeading
                section={findingsSection}
                title={`${numberWord(content.takeaways.length)} findings`}
              />
              <KeyFindings takeaways={content.takeaways} />
            </section>
          )}

          {frequencySection && chart && (
            <section id="frequency" className="scroll-mt-32 pt-24">
              <ReportSectionHeading
                section={frequencySection}
                title="Issue frequency across the set"
                lede={`Every issue raised by more than one respondent, counted once per person. Bars are out of ${chart.total}.`}
              />
              <PainPointChart data={chart} />
            </section>
          )}

          {themesSection && (
            <section id="themes" className="scroll-mt-32 pt-24">
              <ReportSectionHeading
                section={themesSection}
                title={`${numberWord(content.key_themes.length)} themes, with evidence`}
              />
              <div className="flex flex-col gap-6">
                {content.key_themes.map((theme, i) => (
                  <ThemeCard
                    key={theme.heading}
                    index={i + 1}
                    heading={theme.heading}
                    paragraph={theme.paragraph}
                    points={theme.supporting_points ?? []}
                  />
                ))}
              </div>
            </section>
          )}

          {quotesSection && (
            <section id="in-their-words" className="scroll-mt-32 pt-24">
              <ReportSectionHeading section={quotesSection} title="In their words" />
              <QuoteGrid quotes={content.notable_quotes} />
            </section>
          )}

          <section id="methodology" className="scroll-mt-32 pt-24">
            <ReportSectionHeading section={methodologySection} title="How this study was run" />
            <div className="rounded-2xl border border-landing-border bg-landing-surface px-10 py-9 lp-mobile:px-6">
              <p className="m-0 text-[18px] leading-[1.65] text-landing-ink-soft">{report.methodology}</p>
              <p className="m-0 mt-4 text-[18px] leading-[1.65] text-landing-ink-soft">
                Each conversation was a one-on-one interview run by Birdsong. Counts are distinct
                respondents; an issue is counted once per person however often they returned to it.
                Respondent names, emails and companies are not published.
              </p>
              <dl className="m-0 mt-8 grid grid-cols-3 gap-8 border-t border-landing-hair pt-7 lp-mobile:grid-cols-1">
                <div>
                  <dt>
                    <Kicker>Published</Kicker>
                  </dt>
                  <dd className="m-0 mt-2 text-[17px] text-landing-ink">
                    <time dateTime={isoDate(report.publishedAt)}>{formatPublishDate(report.publishedAt)}</time>
                  </dd>
                </div>
                <div>
                  <dt>
                    <Kicker>Interviews</Kicker>
                  </dt>
                  <dd className="m-0 mt-2 text-[17px] text-landing-ink">{report.respondentCount}</dd>
                </div>
                {report.sponsor && (
                  <div>
                    <dt>
                      <Kicker>Sponsored by</Kicker>
                    </dt>
                    <dd className="m-0 mt-2 text-[17px] text-landing-ink">
                      <SponsorMark sponsor={report.sponsor} size="sm" />
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          <div className="mt-24">
            <SubscribeBlock sourceSlug={report.slug} />
          </div>

          <div className="mt-20">
            <MoreResearch reports={others} />
          </div>
        </article>

        <aside className="hidden xl:block">
          <TableOfContents sections={sections} variant="sticky" footer={railFooter} />
        </aside>
      </div>

      <LandingFooter
        description="Birdsong runs paid, in-depth interviews and publishes what the field says."
        crossLink={{ label: "Research", href: "/reports" }}
        variant="minimal"
      />
    </LandingPageShell>
  );
}

const NUMBER_WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
];

/** "Five findings" reads better than "5 findings" in a display heading. */
function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}
