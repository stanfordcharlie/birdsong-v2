// Side-by-side proof: the thin version of a person on the left (grayscaled
// and dimmed, per the handoff) against the Birdsong version on the right,
// which gets two note glyphs floating up as it reveals.
export function ProofSection({
  headlinePre,
  headlineAccent,
  intro,
  thin,
  rich,
}: {
  headlinePre: string;
  headlineAccent: string;
  intro: string;
  thin: {
    label: string;
    initials: string;
    name: string;
    subtitle: string;
    sourceLine: string;
    unknownLine: string;
    caption: string;
  };
  rich: {
    label: string;
    name: string;
    title: string;
    scoreLabel: string;
    quote: string;
    facts: [
      { label: string; value: string },
      { label: string; value: string },
      { label: string; value: string },
    ];
    calloutLabel: string;
    calloutText: string;
  };
}) {
  return (
    <section className="mx-auto max-w-[1480px] px-6 pb-[100px] pt-[104px] md:px-10">
      <div
        data-reveal
        className="mb-[60px] grid grid-cols-[1.1fr_1fr] items-end gap-16 lp-stack:grid-cols-1 lp-stack:gap-6"
      >
        <h2 className="m-0 max-w-[24ch] text-balance font-spectral text-[clamp(36px,3.5vw,54px)] font-medium leading-[1.06] tracking-[-0.018em]">
          {headlinePre}{" "}
          <span className="font-normal italic text-landing-green">{headlineAccent}</span>
        </h2>
        <p className="m-0 mb-2 max-w-[46ch] text-pretty text-[17.5px] leading-[1.62] text-landing-muted">
          {intro}
        </p>
      </div>

      <div className="grid grid-cols-[0.8fr_1.2fr] items-start gap-11 lp-stack:grid-cols-1 lp-stack:gap-9">
        <div data-reveal style={{ transitionDelay: "0.08s" }}>
          <div className="mb-4 text-[12.5px] font-semibold tracking-[0.13em] text-landing-faint">
            {thin.label}
          </div>
          <div className="rounded-[14px] border border-landing-border bg-landing-surface px-[26px] py-6 opacity-70 grayscale">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-landing-border bg-landing-sunk text-[13px] font-semibold text-landing-muted">
                {thin.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[15.5px] font-semibold">{thin.name}</div>
                <div className="truncate text-[13.5px] text-landing-muted">{thin.subtitle}</div>
              </div>
            </div>
            <div className="mt-5 border-t border-landing-hair pt-4 text-[13.5px] leading-[1.6] text-landing-faint">
              {thin.sourceLine}
            </div>
            <div className="mt-2 text-[13.5px] text-landing-faint">{thin.unknownLine}</div>
          </div>
          <p className="m-0 mt-5 max-w-[34ch] text-[15px] leading-[1.65] text-landing-muted">
            {thin.caption}
          </p>
        </div>

        <div data-reveal style={{ transitionDelay: "0.18s" }} className="relative">
          <span
            aria-hidden="true"
            className="lp-proof-note-1 absolute -top-[26px] right-14 text-[17px] text-landing-green opacity-0"
          >
            ♪
          </span>
          <span
            aria-hidden="true"
            className="lp-proof-note-2 absolute -top-4 right-[26px] text-[14px] text-landing-faint opacity-0"
          >
            ♫
          </span>
          <div className="mb-4 text-[12.5px] font-semibold tracking-[0.13em] text-landing-green">
            {rich.label}
          </div>
          <div className="lp-lift rounded-2xl border border-landing-border bg-landing-surface px-9 py-8 shadow-[0_16px_44px_rgba(34,30,24,0.07)] lp-mobile:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{rich.name}</div>
                <div className="mt-[3px] text-sm text-landing-muted">{rich.title}</div>
              </div>
              <span className="shrink-0 rounded-full bg-landing-green-bg px-4 py-[7px] text-[13.5px] font-semibold text-landing-green-deep">
                {rich.scoreLabel}
              </span>
            </div>
            <div className="mt-[22px] max-w-[34ch] font-spectral text-[23px] font-normal italic leading-[1.5] text-landing-ink-soft">
              {rich.quote}
            </div>
            <div className="mt-[26px] grid grid-cols-3 gap-[22px] border-t border-landing-hair pt-[22px] lp-mobile:grid-cols-1 lp-mobile:gap-4">
              {rich.facts.map((fact) => (
                <div key={fact.label}>
                  <div className="mb-[7px] text-[11.5px] font-semibold tracking-[0.1em] text-landing-faint">
                    {fact.label}
                  </div>
                  <div className="text-[14.5px] leading-[1.5] text-landing-ink-soft">
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 max-w-[70ch] rounded-[10px] bg-landing-green-bg px-5 py-[18px] text-[14.5px] leading-[1.6] text-landing-green-deep">
              <span className="font-semibold">{rich.calloutLabel} </span>
              {rich.calloutText}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
