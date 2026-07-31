import Link from "next/link";
import { BirdMark } from "./BirdMark";

// Shared footer (design_handoff_landing_pages_full). Only the cross-link
// and the one-line description differ between the two pages.
//
// The reference's placeholder hrefs point at the real routes here: Log in
// to /admin/login, Privacy to /privacy. Terms is added alongside Privacy
// since the page exists and nothing else in the new design links to it.
export function LandingFooter({
  description,
  crossLink,
  // The PRODUCT column is all in-page anchors, which only resolve on a
  // landing page. The legal pages (/terms, /privacy) reuse this footer but
  // have no #how or #queue to jump to, so they drop that column and point
  // the wordmark at the home page instead of at this page's own top.
  variant = "landing",
}: {
  description: string;
  crossLink: { label: string; href: string };
  variant?: "landing" | "minimal";
}) {
  const isLanding = variant === "landing";
  return (
    <footer className="border-t border-landing-border bg-landing-surface">
      <div
        className={`mx-auto grid max-w-[1480px] gap-12 px-6 pb-10 pt-16 md:px-10 lp-stack:grid-cols-1 lp-stack:gap-9 ${
          isLanding ? "grid-cols-[1.4fr_1fr_1fr]" : "grid-cols-[1.4fr_1fr]"
        }`}
      >
        <div>
          <Link href={isLanding ? "#top" : "/"} className="flex items-center gap-[11px]">
            <BirdMark width={26} height={24} eyeFill="var(--lp-surface)" />
            <span className="font-spectral text-[26px] font-medium tracking-[-0.008em]">
              Birdsong
            </span>
          </Link>
          <p className="m-0 mt-[18px] max-w-[34ch] text-[15.5px] leading-[1.65] text-landing-muted">
            {description}
          </p>
        </div>
        {isLanding && (
          <div className="flex flex-col gap-3.5 text-[14.5px]">
            <div className="mb-0.5 text-[11.5px] font-semibold tracking-[0.12em] text-landing-faint">
              PRODUCT
            </div>
            <Link href="#how" className="lp-undl w-fit text-landing-muted">
              How it works
            </Link>
            <Link href="#queue" className="lp-undl w-fit text-landing-muted">
              The handoff
            </Link>
            <Link href={crossLink.href} className="lp-undl w-fit text-landing-muted">
              {crossLink.label}
            </Link>
          </div>
        )}
        <div className="flex flex-col gap-3.5 text-[14.5px]">
          <div className="mb-0.5 text-[11.5px] font-semibold tracking-[0.12em] text-landing-faint">
            COMPANY
          </div>
          <Link href="/admin/login" className="lp-undl w-fit text-landing-muted">
            Log in
          </Link>
          <a
            href="mailto:charlie@usebirdsong.com"
            className="lp-undl w-fit font-medium text-landing-ink"
          >
            charlie@usebirdsong.com
          </a>
          <Link href="/privacy" className="lp-undl w-fit text-landing-muted">
            Privacy
          </Link>
          <Link href="/terms" className="lp-undl w-fit text-landing-muted">
            Terms
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-[1480px] px-6 pb-[34px] md:px-10">
        <div className="border-t border-landing-hair pt-[22px] text-[13.5px] text-landing-faint">
          © 2026 Birdsong
        </div>
      </div>
    </footer>
  );
}
