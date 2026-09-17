import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { GreenShell } from "@/components/marketing/green/GreenShell";
import { GreenFooter } from "@/components/marketing/green/GreenFooter";
import { ContentsRail } from "@/components/research/report/ContentsRail";
import { FrequencyChart } from "@/components/research/report/FrequencyChart";
import { NotifyBlock } from "@/components/research/report/NotifyBlock";
import { ReportNav } from "@/components/research/report/ReportNav";
import { ReportSectionHead } from "@/components/research/report/ReportSectionHead";
import { StudyProfileCard, type ProfileRow } from "@/components/research/report/StudyProfileCard";
import {
  KeyFindings,
  MethodologyMeta,
  QuoteGrid,
  SponsorMark,
  StatStrip,
  SummaryCallout,
  ThemeCards,
} from "@/components/research/report/ReportBody";
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

const NUMBER_WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
];

/** "Five findings" reads better than "5 findings" in a display heading. */
function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

// Titles are generated from the survey brief and run anywhere from a few
// words to a full sentence. The handoff's single clamp is sized for its own
// example; on a 120-character real title it is seven lines and the whole
// first screen. Step the top of the clamp down by length so a long title
// still reads as a headline rather than a wall.
function titleSize(title: string) {
  if (title.length <= 60) return "text-[clamp(34px,4.2vw,58px)]";
  if (title.length <= 100) return "text-[clamp(30px,3.4vw,46px)]";
  return "text-[clamp(28px,2.8vw,38px)]";
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
    ...(chart ? [{ label: "Issues counted", value: String(chart.bars.length) }] : []),
  ];

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
    publisher: { "@type": "Organization", name: "Birdsong", url: siteUrl() },
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
    <GreenShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReportNav />

      {/* Title block: the report on the left, the study's shape on the right. */}
      <header className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-[48px] px-[20px] pb-[56px] pt-[56px] sm:px-[32px] sm:pt-[72px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[10px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full border-[1.5px] border-ln-ink bg-ln-green-pale px-[16px] py-[8px]">
              Report {reportNumber}
            </span>
            {report.sponsor && (
              <span className="rounded-full border-[1.5px] border-ln-ink px-[16px] py-[8px]">
                {report.sponsor}
              </span>
            )}
            <span className="px-[6px] py-[8px] text-ln-muted">
              {formatPublishMonth(report.publishedAt)}
            </span>
          </div>
          <h1
            className={cn(
              "m-0 mb-[24px] mt-[28px] text-pretty font-jakarta font-extrabold leading-[1.08] tracking-[-0.03em]",
              titleSize(report.title)
            )}
          >
            {report.title}
          </h1>
          <p className="m-0 max-w-[640px] text-pretty text-[clamp(18px,1.5vw,22px)] leading-[1.5] text-ln-body">
            {report.dek}
          </p>
        </div>

        <StudyProfileCard
          rows={profileRows}
          topIssue={chart?.bars[0] ?? null}
          total={chart?.total ?? report.respondentCount}
        />
      </header>

      <StatStrip stats={stats} />

      {/* Body and contents rail. The rail is a real second column at 960px
          and up; below that the grid is one column and ContentsRail hides
          itself. */}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-[48px] px-[20px] pb-[96px] pt-[56px] sm:px-[32px] sm:pt-[80px] ln-rail:grid-cols-[minmax(0,1fr)_260px] ln-rail:gap-[64px]">
        <div className="grid min-w-0 gap-[64px] sm:gap-[96px]">
          <section id="summary" className="min-w-0 scroll-mt-[104px]">
            <ReportSectionHead
              section={summarySection}
              title={`What ${numberWord(report.respondentCount).toLowerCase()} interviews found`}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-[36px]">
              <p className="m-0 text-pretty text-[19px] leading-[1.6] text-ln-body">
                {content.executive_summary}
              </p>
              {report.headline && (
                <SummaryCallout
                  percent={report.headline.percent}
                  label={report.headline.label
                    .replace(/\.+$/, "")
                    .replace(/^./, (c) => c.toLowerCase())}
                />
              )}
            </div>
          </section>

          {findingsSection && (
            <section id="key-findings" className="min-w-0 scroll-mt-[104px]">
              <ReportSectionHead
                section={findingsSection}
                title={`${numberWord(content.takeaways.length)} findings`}
              />
              <KeyFindings takeaways={content.takeaways} />
            </section>
          )}

          {frequencySection && chart && (
            <section id="frequency" className="min-w-0 scroll-mt-[104px]">
              <ReportSectionHead
                section={frequencySection}
                title="Issue frequency across the set"
                lede={`Every issue raised by more than one respondent, counted once per person. Bars are out of ${chart.total}.`}
              />
              <FrequencyChart data={chart} />
            </section>
          )}

          {themesSection && (
            <section id="themes" className="min-w-0 scroll-mt-[104px]">
              <ReportSectionHead
                section={themesSection}
                title={`${numberWord(content.key_themes.length)} themes, with evidence`}
              />
              <ThemeCards themes={content.key_themes} />
            </section>
          )}

          {quotesSection && (
            <section id="in-their-words" className="min-w-0 scroll-mt-[104px]">
              <ReportSectionHead section={quotesSection} title="In their words" />
              <QuoteGrid quotes={content.notable_quotes} />
            </section>
          )}

          <section id="methodology" className="min-w-0 scroll-mt-[104px]">
            <ReportSectionHead section={methodologySection} title="How this study was run" />
            <p className="m-0 mb-[14px] max-w-[680px] text-pretty text-[19px] leading-[1.55] text-ln-body">
              {report.methodology}
            </p>
            <p className="m-0 mb-[32px] max-w-[680px] text-pretty text-[19px] leading-[1.55] text-ln-body">
              Each conversation was a one-on-one interview run by Birdsong. Counts are distinct
              respondents; an issue is counted once per person however often they returned to it.
              Respondent names, emails and companies are not published.
            </p>
            <MethodologyMeta
              items={[
                {
                  label: "Published",
                  value: (
                    <time dateTime={isoDate(report.publishedAt)}>
                      {formatPublishDate(report.publishedAt)}
                    </time>
                  ),
                },
                { label: "Interviews", value: report.respondentCount },
                ...(report.sponsor
                  ? [
                      {
                        label: "Sponsored by",
                        value: <SponsorMark sponsor={report.sponsor} />,
                      },
                    ]
                  : []),
              ]}
            />
          </section>

          <NotifyBlock sourceSlug={report.slug} />
        </div>

        <ContentsRail
          sections={sections}
          footer={
            <>
              Birdsong Research · Report {reportNumber}
              <br />
              Published {formatPublishDate(report.publishedAt)}
            </>
          }
        />
      </div>

      <GreenFooter
        bordered
        tagline="Birdsong runs in-depth interviews and publishes what the field says."
        column={{
          heading: "Research",
          links: [
            { label: "All reports", href: "/reports" },
            { label: "Methodology", href: "#methodology" },
          ],
        }}
      />
    </GreenShell>
  );
}
