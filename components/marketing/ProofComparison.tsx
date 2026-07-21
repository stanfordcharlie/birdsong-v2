// The "proof of depth" two-card comparison (design_handoff_landing_pages_full)
// — a grayscale, sparse "usually" card next to a rich Birdsong card with a
// pull quote, signal list, and a drafted callout. Two music notes float up
// as the right card reveals.
export function ProofComparison({
  headlinePre,
  headlineGreen,
  intro,
  leftLabel,
  leftInitials,
  leftName,
  leftSubline,
  leftSourceLine,
  rightLabel,
  rightName,
  rightTitleLine,
  rightScoreLabel,
  pullQuote,
  signals,
  calloutLabel,
  calloutText,
}: {
  headlinePre: string;
  headlineGreen: string;
  intro: string;
  leftLabel: string;
  leftInitials: string;
  leftName: string;
  leftSubline: string;
  leftSourceLine: string;
  rightLabel: string;
  rightName: string;
  rightTitleLine: string;
  rightScoreLabel: string;
  pullQuote: string;
  signals: [string, string, string];
  calloutLabel: string;
  calloutText: string;
}) {
  return (
    <section className="mx-auto max-w-[1360px] px-6 pb-[100px] pt-9 md:px-12">
      <h2
        data-reveal="1"
        className="text-balance m-0 mb-3.5 max-w-[760px] font-bricolage text-[48px] font-bold leading-[1.08] tracking-[-0.02em]"
      >
        {headlinePre} <span className="text-landing-green">{headlineGreen}</span>
      </h2>
      <p
        data-reveal="1"
        style={{ transitionDelay: "0.08s" }}
        className="text-pretty m-0 mb-[52px] max-w-[560px] text-[17px] leading-[1.6] text-landing-muted"
      >
        {intro}
      </p>
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_1.35fr]">
        <div data-reveal="1" style={{ transitionDelay: "0.1s" }}>
          <div className="mb-[14px] text-[13px] font-semibold tracking-[0.12em] text-landing-faint">{leftLabel}</div>
          <div className="rounded-2xl border border-landing-border bg-landing-surface px-[22px] py-[18px] opacity-[0.72] grayscale">
            <div className="flex items-center gap-3.5">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-landing-border text-[13px] font-semibold text-landing-muted">
                {leftInitials}
              </div>
              <div>
                <div className="text-[15px] font-semibold">{leftName}</div>
                <div className="text-[13px] text-landing-muted">{leftSubline}</div>
              </div>
            </div>
            <div className="mt-3.5 border-t border-landing-border pt-3.5 text-[13px] text-landing-faint">
              {leftSourceLine}
            </div>
            <div className="mt-1.5 text-[13px] text-landing-faint">Everything else: unknown</div>
          </div>
        </div>
        <div data-reveal="1" style={{ transitionDelay: "0.2s" }} className="relative">
          <span
            className="lp-proof-note-1 absolute -top-6 right-14 text-lg text-landing-green opacity-0"
            aria-hidden="true"
          >
            &#9834;
          </span>
          <span
            className="lp-proof-note-2 absolute -top-3.5 right-[26px] text-[15px] text-landing-faint opacity-0"
            aria-hidden="true"
          >
            &#9835;
          </span>
          <div className="mb-[14px] text-[13px] font-semibold tracking-[0.12em] text-landing-green">
            {rightLabel}
          </div>
          <div className="lp-lift rounded-2xl border border-landing-border bg-landing-surface px-7 py-6 shadow-[0_14px_40px_rgba(38,32,25,.09)]">
            <div className="flex items-center justify-between gap-3.5">
              <div>
                <div className="text-[17px] font-semibold">{rightName}</div>
                <div className="text-[13.5px] text-landing-muted">{rightTitleLine}</div>
              </div>
              <span className="rounded-full bg-landing-green-bg px-[15px] py-1.5 text-sm font-semibold text-landing-green">
                {rightScoreLabel}
              </span>
            </div>
            <div className="mt-4 font-spectral text-[16.5px] italic leading-[1.5]">&ldquo;{pullQuote}&rdquo;</div>
            <div className="mt-4 flex flex-col gap-2 text-[13.5px] text-landing-muted">
              {signals.map((signal) => (
                <div key={signal} className="flex gap-2.5">
                  <span className="text-landing-green">&#9834;</span>
                  {signal}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[10px] bg-landing-green-bg px-4 py-[13px] text-[13.5px] leading-[1.55] text-landing-green">
              <b>{calloutLabel}</b> &ldquo;{calloutText}&rdquo;
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
