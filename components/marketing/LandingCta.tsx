import Link from "next/link";
import { BirdMark } from "./BirdMark";

// Final CTA (design_handoff_landing_pages_full): the bird takes off on
// reveal, leaving three staggered trailing notes, above a big headline
// with its last word in blue.
export function LandingCta({ headlinePre, headlineBlue }: { headlinePre: string; headlineBlue: string }) {
  return (
    <section className="mx-auto max-w-[1360px] px-6 pb-[130px] pt-5 md:px-12">
      <div data-reveal="1" className="relative text-center">
        <div className="relative inline-block">
          <BirdMark width={40} height={37} className="lp-cta-bird mx-auto mb-[18px] block" />
          <span className="lp-cta-trail-1 absolute left-[52%] top-0 text-[17px] text-landing-green opacity-0" aria-hidden="true">
            &#9834;
          </span>
          <span
            className="lp-cta-trail-2 absolute left-[44%] top-2 text-sm text-landing-faint opacity-0"
            aria-hidden="true"
          >
            &#9835;
          </span>
          <span
            className="lp-cta-trail-3 absolute left-[58%] -top-1.5 text-[15px] text-landing-muted opacity-0"
            aria-hidden="true"
          >
            &#9834;
          </span>
        </div>
        <h2 className="text-balance m-0 font-bricolage text-[62px] font-bold leading-[1.06] tracking-[-0.022em]">
          {headlinePre} <span className="text-landing-blue">{headlineBlue}</span>
        </h2>
        <div className="mt-[34px]">
          <Link
            href="/admin/signup"
            className="inline-block rounded-full bg-landing-ink px-[34px] py-4 text-[16.5px] font-semibold text-landing-bg"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
