// FAQ built on native <details>, so it works before hydration and stays
// keyboard/screen-reader correct without any state. The first item ships
// open, per the handoff. The plus glyph rotates 45deg into an x when its
// item opens (.lp-faq[open] .lp-chev in globals.css).
export function FaqSection({
  headline,
  items,
}: {
  headline: string;
  items: { question: string; answer: string }[];
}) {
  return (
    <section className="mx-auto max-w-[1480px] px-6 pb-[104px] pt-6 md:px-10">
      <div className="grid grid-cols-[0.66fr_1.34fr] items-start gap-14 lp-stack:grid-cols-1 lp-stack:gap-6">
        <h2
          data-reveal
          className="m-0 max-w-[16ch] text-balance font-spectral text-[clamp(30px,2.6vw,40px)] font-medium leading-[1.1] tracking-[-0.016em]"
        >
          {headline}
        </h2>
        <div data-reveal style={{ transitionDelay: "0.08s" }}>
          {items.map((item, i) => (
            <details key={item.question} className="lp-faq" open={i === 0}>
              <summary>
                {item.question}
                <svg
                  className="lp-chev shrink-0"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1v12M1 7h12"
                    stroke="var(--lp-muted)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </summary>
              <div className="max-w-[78ch] px-0.5 pb-7 text-[16.5px] leading-[1.7] text-landing-muted">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
