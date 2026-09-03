import Link from "next/link";
import { BirdMark } from "@/components/marketing/BirdMark";

/**
 * The report page's top bar: a flat, full-width band rather than the
 * landing capsule. The wordmark and a RESEARCH kicker on the left, one
 * anchor and one call to action on the right. Sticky, on a near-opaque
 * ground so the report scrolls under it.
 */
export function ReportNav() {
  return (
    <nav
      data-landing-nav
      data-scrolled="0"
      aria-label="Report"
      className="sticky top-0 z-[60] border-b border-landing-hair bg-[rgba(250,248,241,0.94)] backdrop-blur-[14px]"
    >
      <div className="mx-auto flex h-[84px] max-w-[1480px] items-center justify-between gap-6 px-6 md:px-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-[11px] no-underline">
            <BirdMark className="shrink-0" />
            <span className="font-bricolage text-[24px] font-bold tracking-[-0.03em] text-landing-ink">
              Birdsong
            </span>
          </Link>
          <span aria-hidden className="h-6 w-px bg-landing-border" />
          <Link
            href="/reports"
            className="font-mono text-[12.5px] font-medium uppercase tracking-[0.2em] text-landing-muted no-underline hover:text-landing-ink"
          >
            Research
          </Link>
        </div>
        <div className="flex items-center gap-7">
          <a href="#methodology" className="lp-undl text-[16.5px] font-medium text-landing-ink lp-mobile:hidden">
            Methodology
          </a>
          <Link
            href="/admin/signup"
            className="lp-hard-cta rounded-full border-2 border-landing-ink bg-landing-surface px-6 py-3 text-[16.5px] font-bold text-landing-ink no-underline shadow-[4px_4px_0_var(--lp-ink)]"
          >
            Run this study
          </Link>
        </div>
      </div>
    </nav>
  );
}
