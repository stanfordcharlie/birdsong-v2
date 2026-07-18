const CHIP_DELAYS = ["0s", "1.5s", "3s"];

export function HowItWorksSection({
  heading,
  headingMaxWidth = 520,
  invite,
  converse,
  converseChipsMaxWidth = 220,
  deliver,
}: {
  heading: string;
  headingMaxWidth?: number;
  invite: { text: string };
  converse: { text: string; chips: string[] };
  converseChipsMaxWidth?: number;
  deliver: { text: string; cardTitle: string; cardSubtitle: string; cardPill: string };
}) {
  return (
    <div className="mt-[110px] bg-[linear-gradient(180deg,rgba(51,104,75,0)_0%,rgba(51,104,75,0.08)_22%,rgba(51,104,75,0.08)_100%)]">
      <section id="how" className="mx-auto max-w-[1120px] px-8 py-[90px]">
        <p className="mb-3.5 text-[13px] uppercase tracking-[0.14em] text-[#33684B]">
          How it works
        </p>
        <h2
          className="mb-16 font-newsreader text-[clamp(30px,3.6vw,44px)] font-medium leading-[1.15] tracking-[-0.015em] text-[#211D16]"
          style={{ maxWidth: `${headingMaxWidth}px` }}
        >
          {heading}
        </h2>

        <div className="grid grid-cols-1 gap-12 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          <div className="border-t border-[rgba(33,29,22,0.25)] pt-6">
            <div className="relative mb-[18px] flex h-[120px] items-center justify-start">
              <div className="relative ml-2 h-[90px] w-[90px]">
                <span
                  className="absolute inset-0 rounded-full border-[1.5px] border-[#33684B] motion-reduce:![animation:none]"
                  style={{ animation: "ripple 2.8s ease-out infinite" }}
                />
                <span
                  className="absolute inset-0 rounded-full border-[1.5px] border-[#33684B] motion-reduce:![animation:none]"
                  style={{ animation: "ripple 2.8s ease-out 1s infinite" }}
                />
                <span
                  className="absolute inset-0 rounded-full border-[1.5px] border-[#33684B] motion-reduce:![animation:none]"
                  style={{ animation: "ripple 2.8s ease-out 2s infinite" }}
                />
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -m-[5px] rounded-full bg-[#211D16]" />
              </div>
            </div>
            <h3 className="mb-2.5 font-newsreader text-2xl font-medium text-[#211D16]">
              Invite
            </h3>
            <p className="text-pretty text-[15px] leading-[1.65] text-[#5D5748]">{invite.text}</p>
          </div>

          <div className="border-t border-[rgba(33,29,22,0.25)] pt-6">
            <div
              className="mb-[18px] flex h-[120px] flex-col justify-center gap-2"
              style={{ maxWidth: `${converseChipsMaxWidth}px` }}
            >
              {converse.chips.map((chip, i) => (
                <span
                  key={chip}
                  className="w-fit rounded-lg border border-[rgba(33,29,22,0.16)] bg-[#FDFDFC] px-2.5 py-[5px] text-[12.5px] text-[#211D16] motion-reduce:![animation:none]"
                  style={{ animation: `chipCycle 9s infinite`, animationDelay: CHIP_DELAYS[i] }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <h3 className="mb-2.5 font-newsreader text-2xl font-medium text-[#211D16]">
              Converse
            </h3>
            <p className="text-pretty text-[15px] leading-[1.65] text-[#5D5748]">
              {converse.text}
            </p>
          </div>

          <div className="border-t border-[rgba(33,29,22,0.25)] pt-6">
            <div className="mb-[18px] flex h-[120px] items-center">
              <div
                className="flex items-center gap-3 rounded-xl border border-[rgba(33,29,22,0.14)] bg-[#FDFDFC] px-4 py-3.5 shadow-[0_12px_28px_-14px_rgba(33,29,22,0.3)] motion-reduce:![animation:none]"
                style={{ animation: "floatCard 6s ease-in-out infinite" }}
              >
                <div>
                  <div className="text-[13.5px] font-semibold text-[#211D16]">
                    {deliver.cardTitle}
                  </div>
                  <div className="text-xs text-[#6b7280]">{deliver.cardSubtitle}</div>
                </div>
                <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-[3px] text-[11.5px] font-semibold text-[#15803d]">
                  {deliver.cardPill}
                </span>
              </div>
            </div>
            <h3 className="mb-2.5 font-newsreader text-2xl font-medium text-[#211D16]">
              Deliver
            </h3>
            <p className="text-pretty text-[15px] leading-[1.65] text-[#5D5748]">
              {deliver.text}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
