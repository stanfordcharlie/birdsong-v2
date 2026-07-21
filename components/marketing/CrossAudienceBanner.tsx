import Link from "next/link";

// Cross-audience banner near the footer (design_handoff_landing_pages_full)
// — links each landing page to the other.
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
    <section className="mx-auto max-w-[1360px] px-6 pb-[100px] md:px-12">
      <Link
        data-reveal="1"
        href={href}
        className="lp-lift flex flex-wrap items-center justify-between gap-7 rounded-[18px] border border-landing-border bg-landing-green-bg px-10 py-[34px]"
      >
        <div>
          <div className="mb-2 font-bricolage text-[25px] font-bold tracking-[-0.01em] text-landing-ink">
            {heading}
          </div>
          <div className="text-[15.5px] leading-[1.55] text-landing-green">{subtext}</div>
        </div>
        <span className="flex shrink-0 items-center gap-2.5 text-[15px] font-semibold text-landing-green">
          {linkLabel}
          <svg width="20" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true">
            <path
              d="M1 6h18m0 0l-4-4.5M19 6l-4 4.5"
              stroke="var(--lp-green)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </Link>
    </section>
  );
}
