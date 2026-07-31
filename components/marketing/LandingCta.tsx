import Link from "next/link";
import { BirdMark } from "./BirdMark";

// Final CTA (design_handoff_landing_pages_full): the bird takes off on
// reveal, leaving three staggered trailing notes, above a big headline
// whose closing phrase is set in green italic.
export function LandingCta({
  headlinePre,
  headlineAccent,
  subhead,
}: {
  headlinePre: string;
  headlineAccent: string;
  subhead: string;
}) {
  return (
    <section className="mx-auto max-w-[1480px] px-6 pb-[140px] pt-5 md:px-10">
      <div data-reveal className="relative text-center">
        <div className="relative inline-block">
          <BirdMark width={38} height={35} className="lp-cta-bird mx-auto mb-[22px] block" />
          <span
            className="lp-cta-trail-1 absolute left-[52%] top-0 text-[16px] text-landing-green opacity-0"
            aria-hidden="true"
          >
            ♪
          </span>
          <span
            className="lp-cta-trail-2 absolute left-[44%] top-2 text-[13px] text-landing-faint opacity-0"
            aria-hidden="true"
          >
            ♫
          </span>
          <span
            className="lp-cta-trail-3 absolute -top-1.5 left-[58%] text-[14px] text-landing-muted opacity-0"
            aria-hidden="true"
          >
            ♪
          </span>
        </div>
        <h2 className="m-0 mx-auto max-w-[22ch] text-balance font-spectral text-[clamp(40px,4.4vw,68px)] font-medium leading-[1.06] tracking-[-0.02em]">
          {headlinePre} <span className="font-normal italic text-landing-green">{headlineAccent}</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[48ch] text-pretty text-[18px] leading-[1.6] text-landing-muted">
          {subhead}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/admin/signup"
            className="lp-cta inline-block rounded-full bg-landing-ink px-9 py-[17px] text-[16.5px] font-semibold text-landing-bg"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
