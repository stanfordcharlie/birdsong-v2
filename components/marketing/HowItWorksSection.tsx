import { cn } from "@/lib/utils";

// headlineFontSizePx only ever takes these two literal values (one per
// landing page) — mapped to literal Tailwind classes rather than an inline
// style so the lp-mobile: variant below can actually override it. An inline
// style.fontSize would always win over any class, mobile included.
const HEADLINE_SIZE_CLASSES = {
  48: "text-[48px]",
  46: "text-[46px]",
} as const;

// "How it works" section shell (design_handoff_landing_pages_full) —
// eyebrow pill, H2, right-aligned aside, and a 3-column grid of steps
// (HowItWorksStep + its graphic, passed as children). Headline size/line-
// height/max-width differ slightly between the two pages' copy lengths.
export function HowItWorksSection({
  headline,
  headlineFontSizePx,
  headlineLineHeight,
  headlineMaxWidthPx,
  kicker,
  children,
}: {
  headline: string;
  headlineFontSizePx: 48 | 46;
  headlineLineHeight: 1.14;
  headlineMaxWidthPx: 640 | 720;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id="how"
      className="mx-auto max-w-[1360px] px-6 pb-[84px] pt-[92px] md:px-12 lp-mobile:px-[22px] lp-mobile:pb-12 lp-mobile:pt-14"
    >
      <div data-reveal="1" className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <div className="mb-4 inline-block rounded-full bg-landing-green-bg px-[15px] py-[7px] text-[12.5px] font-bold tracking-[0.12em] text-landing-green">
            HOW IT WORKS
          </div>
          <h2
            className={cn(
              "text-balance m-0 font-spectral font-medium tracking-[-0.012em] lp-mobile:text-[33px]",
              HEADLINE_SIZE_CLASSES[headlineFontSizePx]
            )}
            style={{ lineHeight: headlineLineHeight, maxWidth: headlineMaxWidthPx }}
          >
            {headline}
          </h2>
        </div>
        <div className="max-w-[300px] pb-2 text-[15px] leading-[1.55] text-landing-muted">{kicker}</div>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3 lp-mobile:gap-7">{children}</div>
    </section>
  );
}
