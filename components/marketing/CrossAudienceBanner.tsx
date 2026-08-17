import Link from "next/link";

// Cross-audience banner above the final CTA — links each landing page to
// the other (design_handoff_landing_pages_full).
export function CrossAudienceBanner({
  heading,
  subtext,
  linkLabel,
  href,
}: {
  heading: string;
  subtext: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <section className="mx-auto max-w-[1480px] px-6 pb-[100px] md:px-10">
      <Link
        data-reveal
        href={href}
        className="lp-lift flex items-center justify-between gap-10 rounded-2xl border border-landing-border bg-landing-green-bg px-11 py-10 lp-stack:flex-col lp-stack:items-start lp-stack:gap-6 lp-mobile:px-6 lp-mobile:py-8"
      >
        <div>
          <div className="mb-2.5 font-bricolage text-[28px] font-medium tracking-[-0.012em] text-landing-ink">
            {heading}
          </div>
          <div className="max-w-[60ch] text-[16.5px] leading-[1.6] text-landing-green-deep">
            {subtext}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2.5 text-[15px] font-semibold text-landing-green-deep">
          {linkLabel}
          <svg width="20" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true">
            <path
              d="M1 6h18m0 0l-4-4.5M19 6l-4 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </Link>
    </section>
  );
}
