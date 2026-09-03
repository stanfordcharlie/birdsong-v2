import Link from "next/link";
import type { ReportQuote } from "@/lib/report/generate";
import type { ReportSection } from "@/lib/reports/chart-data";
import type { PublicReport } from "@/lib/reports/public";
import { formatPublishDate } from "@/lib/reports/format";
import { ReportContents } from "./ReportContents";

/**
 * The library's shared blocks. Marketing tokens only (--lp-*, via the
 * `landing-*` Tailwind names); nothing here imports from
 * components/admin/ui or reads a --ds-* token.
 *
 * Type: Bricolage for headings, Spectral for ledes and quotes, DM Sans for
 * body, and a mono face for every kicker, number and figure.
 */

/** Mono kicker: the small tracked label over a heading or a card. */
export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-landing-muted ${className}`}
    >
      {children}
    </div>
  );
}

/** Small caps eyebrow, kept for the library index. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12.5px] font-semibold tracking-[0.13em] text-landing-faint">
      {children}
    </div>
  );
}

/**
 * Sponsor attribution. Studies carry a sponsor as free text and sponsors
 * have no brand record of their own, so the mark is set rather than drawn:
 * an initial in a green chip plus the name.
 */
export function SponsorMark({ sponsor, size = "default" }: { sponsor: string; size?: "default" | "sm" }) {
  const sm = size === "sm";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-landing-green font-bricolage font-bold text-landing-bg ${
          sm ? "h-6 w-6 text-[12px]" : "h-8 w-8 text-[15px]"
        }`}
      >
        {sponsor.trim().charAt(0).toUpperCase()}
      </span>
      <span className={`font-medium ${sm ? "text-[14px]" : "text-[15px]"}`}>{sponsor}</span>
    </span>
  );
}

/**
 * A numbered section: mono "01  KICKER", the heading, an optional lede.
 * The id is the contents-rail anchor and the scroll-spy target.
 */
export function ReportSectionHeading({
  section,
  title,
  lede,
}: {
  section: ReportSection;
  title: string;
  lede?: React.ReactNode;
}) {
  return (
    <div className="mb-9">
      <Kicker>
        <span className="mr-4">{section.number}</span>
        {section.kicker}
      </Kicker>
      <h2 className="m-0 mt-5 text-balance font-bricolage text-[clamp(34px,3.6vw,48px)] font-bold leading-[1.04] tracking-[-0.03em] text-landing-ink">
        {title}
      </h2>
      {lede && (
        <p className="m-0 mt-4 max-w-[64ch] text-pretty text-[19px] leading-[1.55] text-landing-muted">
          {lede}
        </p>
      )}
    </div>
  );
}

/**
 * Key findings: one card per takeaway, numbered in mono. This is the unit
 * most readers take away whole, so each gets its own surface.
 */
export function KeyFindings({ takeaways }: { takeaways: string[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-5 p-0">
      {takeaways.map((t, i) => (
        <li
          key={i}
          className="grid grid-cols-[72px_minmax(0,1fr)] gap-6 rounded-2xl border border-landing-border bg-landing-surface px-9 py-8 lp-mobile:grid-cols-1 lp-mobile:gap-3 lp-mobile:px-6"
        >
          <span aria-hidden className="font-mono text-[30px] font-bold leading-none tracking-[-0.02em] text-landing-green">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="m-0 text-[21px] font-semibold leading-[1.4] tracking-[-0.01em] text-landing-ink">{t}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Pull quote. The oversized opening mark is decorative, so the quoted text
 * stays clean for a screen reader.
 */
export function PullQuote({ quote }: { quote: ReportQuote }) {
  return (
    <figure className="relative m-0 flex h-full flex-col overflow-hidden rounded-2xl border border-landing-border bg-landing-surface px-8 pb-7 pt-12">
      <span
        aria-hidden
        className="pointer-events-none absolute left-7 top-3 font-spectral text-[64px] leading-none text-landing-green opacity-20"
      >
        &ldquo;
      </span>
      <blockquote className="relative m-0 font-spectral text-[21px] italic leading-[1.5] text-landing-ink">
        {quote.quote}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-2.5 pt-6 font-mono text-[13px] uppercase tracking-[0.12em] text-landing-muted">
        <span aria-hidden className="h-px w-6 bg-landing-green" />
        {quote.attribution}
      </figcaption>
    </figure>
  );
}

/** The quotes grid. Two columns on desktop, one on a phone. */
export function QuoteGrid({ quotes }: { quotes: ReportQuote[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 lp-stack:grid-cols-1">
      {quotes.map((q, i) => (
        <PullQuote key={i} quote={q} />
      ))}
    </div>
  );
}

/**
 * A theme in detail: the number in a green disc, a mono kicker, the heading,
 * the paragraph, then the evidence as a dashed list on the sunk surface.
 */
export function ThemeCard({
  index,
  heading,
  paragraph,
  points,
}: {
  index: number;
  heading: string;
  paragraph: string;
  points: string[];
}) {
  return (
    <article className="rounded-2xl border border-landing-border bg-landing-surface px-11 py-10 lp-mobile:px-6 lp-mobile:py-7">
      <div className="mb-6 flex items-center gap-5">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-landing-green-deep font-mono text-[17px] font-bold text-landing-bg"
        >
          {index}
        </span>
        <Kicker>Theme</Kicker>
      </div>
      <h3 className="m-0 text-balance font-bricolage text-[clamp(26px,2.6vw,34px)] font-bold leading-[1.1] tracking-[-0.025em] text-landing-ink">
        {heading}
      </h3>
      <p className="m-0 mt-5 text-[18.5px] leading-[1.65] text-landing-ink-soft">{paragraph}</p>
      {points.length > 0 && (
        <ul className="m-0 mt-8 list-none rounded-xl bg-landing-sunk px-8 py-3 lp-mobile:px-5">
          {points.map((point, j) => (
            <li
              key={j}
              className="flex gap-5 border-b border-landing-hair py-5 text-[17px] leading-[1.55] text-landing-ink-soft last:border-b-0"
            >
              <span aria-hidden className="shrink-0 text-landing-muted">
                &ndash;
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/**
 * Table of contents. "sticky" is the desktop rail with the scroll-spy;
 * "collapsed" is a <details>, which opens with no JavaScript and stays
 * keyboard-operable.
 */
export function TableOfContents({
  sections,
  variant,
  footer,
}: {
  sections: ReportSection[];
  variant: "sticky" | "collapsed";
  footer?: React.ReactNode;
}) {
  if (variant === "sticky") {
    return <ReportContents sections={sections} footer={footer} />;
  }

  return (
    <details className="mb-10 rounded-xl border border-landing-border bg-landing-surface px-5 py-4">
      <summary className="cursor-pointer list-none font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-landing-muted">
        Contents
      </summary>
      <ol className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="lp-undl text-[16px] text-landing-muted">
              <span className="mr-3 font-mono text-[13px]">{s.number}</span>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Two or three other public reports, at the foot of a report page. */
export function MoreResearch({ reports }: { reports: PublicReport[] }) {
  if (reports.length === 0) return null;
  return (
    <section className="border-t border-landing-hair pt-12">
      <Kicker>More research</Kicker>
      <div className="mt-6 grid grid-cols-3 gap-6 lp-stack:grid-cols-1">
        {reports.map((r) => (
          <Link
            key={r.slug}
            href={`/reports/${r.slug}`}
            className="lp-lift block rounded-2xl border border-landing-border bg-landing-surface p-6 no-underline"
          >
            {r.sponsor && (
              <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.16em] text-landing-faint">
                {r.sponsor}
              </div>
            )}
            <div className="font-bricolage text-[19px] font-bold leading-[1.22] tracking-[-0.015em] text-landing-ink">
              {r.title}
            </div>
            <div className="mt-3 text-[14.5px] text-landing-faint">
              {formatPublishDate(r.publishedAt)} · {r.respondentCount} interviews
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
