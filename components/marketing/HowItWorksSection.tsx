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
  headlineLineHeight: 1.06 | 1.08;
  headlineMaxWidthPx: 640 | 720;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section id="how" className="mx-auto max-w-[1360px] px-6 pb-[84px] pt-[92px] md:px-12">
      <div data-reveal="1" className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <div className="mb-4 inline-block rounded-full bg-landing-green-bg px-[15px] py-[7px] text-[12.5px] font-bold tracking-[0.12em] text-landing-green">
            HOW IT WORKS
          </div>
          <h2
            className="text-balance m-0 font-bricolage font-bold tracking-[-0.02em]"
            style={{ fontSize: headlineFontSizePx, lineHeight: headlineLineHeight, maxWidth: headlineMaxWidthPx }}
          >
            {headline}
          </h2>
        </div>
        <div className="max-w-[300px] pb-2 text-[15px] leading-[1.55] text-landing-muted">{kicker}</div>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3">{children}</div>
    </section>
  );
}
