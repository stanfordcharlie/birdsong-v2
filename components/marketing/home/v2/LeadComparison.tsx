/**
 * The Lead: the same person as a form fill and as a Birdsong lead, side by
 * side. auto-fit/minmax rather than a breakpoint — the pair stacks when the
 * container can no longer give each card 300px.
 */
export function LeadComparison() {
  return (
    <section id="lead" className="mx-auto max-w-[1200px] px-[24px] pb-[120px]">
      <div className="mx-auto mb-[44px] flex max-w-[820px] flex-col items-center gap-[20px] text-center">
        <div className="text-[22px] text-hp-muted">The Lead</div>
        <h2 className="m-0 text-balance font-hp-serif text-[clamp(40px,5.2vw,72px)] font-normal leading-[1.02] tracking-[-0.02em]">
          Every Lead Arrives With The Whole Story.
        </h2>
        <p className="m-0 max-w-[720px] text-pretty text-[clamp(18px,1.7vw,24px)] leading-[1.4] text-hp-body">
          Two versions of the same person. One is a name and an email address. The other is a
          conversation your rep can open with.
        </p>
      </div>

      <div className="mx-auto grid max-w-[1000px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[20px]">
        <div className="flex flex-col gap-[20px] rounded-[8px] border border-hp-line bg-hp-card p-[28px]">
          <div className="text-[12px] tracking-[0.1em] text-hp-faint">A LEAD, USUALLY</div>
          <div className="flex items-center gap-[18px]">
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[6px] bg-hp-tint text-[18px] text-hp-faint">
              JR
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-hp-serif text-[26px] leading-none">Jordan Reyes</span>
              <span className="text-[15px] text-hp-muted">jordan.reyes@coretide.com</span>
            </div>
          </div>
          <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-[12px] gap-y-[8px] text-[15px]">
            <span className="text-hp-faint">Source</span>
            <span>Downloaded “State of Inbound.pdf”</span>
            <span className="text-hp-faint">Pain</span>
            <span className="text-hp-faint">unknown</span>
            <span className="text-hp-faint">Buyer</span>
            <span className="text-hp-faint">unknown</span>
            <span className="text-hp-faint">Timeline</span>
            <span className="text-hp-faint">unknown</span>
          </div>
          <p className="mb-0 mt-auto font-hp-serif text-[18px] italic leading-[1.35] text-hp-muted">
            A rep guesses the pain, guesses the timing, and opens with a persona.
          </p>
        </div>

        <div className="flex flex-col gap-[18px] rounded-[8px] border border-hp-ink bg-hp-card p-[28px]">
          <div className="flex items-center justify-between gap-[12px]">
            <span className="text-[12px] tracking-[0.1em] text-hp-green">A BIRDSONG LEAD</span>
            <span className="rounded-full bg-hp-green px-[12px] py-[4px] text-[13px] text-hp-cream">
              Score 9 / 10
            </span>
          </div>
          <div className="flex items-center gap-[18px]">
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[6px] bg-hp-green-pale text-[18px] font-semibold text-hp-green">
              SO
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-hp-serif text-[26px] leading-none">Sam Okafor</span>
              <span className="text-[15px] text-hp-muted">Head of Growth · Coretide</span>
            </div>
          </div>
          <p className="m-0 font-hp-serif text-[clamp(20px,1.8vw,24px)] leading-[1.25] tracking-[-0.01em]">
            “We spend our best hours triaging inbound that goes nowhere.”
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[14px]">
            <div className="flex flex-col gap-[4px] border-t border-hp-ink pt-[8px]">
              <span className="text-[12px] tracking-[0.12em] text-hp-muted">METRIC</span>
              <span className="text-[14px] leading-[1.35]">40 hours a month lost to manual triage</span>
            </div>
            <div className="flex flex-col gap-[4px] border-t border-hp-ink pt-[8px]">
              <span className="text-[12px] tracking-[0.12em] text-hp-muted">ECONOMIC BUYER</span>
              <span className="text-[14px] leading-[1.35]">CRO, named in the conversation</span>
            </div>
            <div className="flex flex-col gap-[4px] border-t border-hp-ink pt-[8px]">
              <span className="text-[12px] tracking-[0.12em] text-hp-muted">TIMELINE</span>
              <span className="text-[14px] leading-[1.35]">Evaluating this quarter</span>
            </div>
          </div>
          <div className="rounded-[6px] bg-hp-tint px-[16px] py-[14px] text-[14px] leading-[1.5]">
            <span className="text-hp-green">Call opener, generated:</span> “You said triage eats your
            team’s best hours. Walk me through the worst morning, and I’ll show you where those hours
            go.”
          </div>
        </div>
      </div>
    </section>
  );
}
