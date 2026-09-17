import { SectionHeading } from "./SectionHeading";

// The three qualified facts, each with its own rule colour — the palette
// steps down from primary green through mid to sage, left to right.
const FACTS = [
  {
    label: "Metric",
    value: "40 hours a month lost to manual triage",
    rule: "border-t-ln-green",
  },
  {
    label: "Economic buyer",
    value: "CRO, named in the conversation",
    rule: "border-t-ln-green-mid",
  },
  { label: "Timeline", value: "Evaluating this quarter", rule: "border-t-ln-sage" },
];

// The four "unknown" rows on the thin lead. Source is the only one that
// carries a value, which is the whole point of the comparison.
const THIN_ROWS = [
  { label: "Source", value: "Downloaded “State of Inbound.pdf”", known: true },
  { label: "Pain", value: "unknown", known: false },
  { label: "Buyer", value: "unknown", known: false },
  { label: "Timeline", value: "unknown", known: false },
];

/**
 * The same person as an ordinary MQL and as a Birdsong lead, side by side.
 *
 * The contrast is carried by the card treatment as much as the content: the
 * left card is a soft-bordered white box, the right one is a sticker card
 * with a 2.5px ink border and a 10px green offset shadow. Both columns are
 * `auto-fit minmax(320px, 1fr)`, so they stack rather than squeeze.
 */
export function LeadComparison() {
  return (
    <section id="story" className="bg-ln-cream px-[20px] py-[64px] sm:px-[32px] sm:py-[96px]">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          heading="Every lead arrives with the whole story."
          sub="Two versions of the same person. One is a name and an email address. The other is a conversation your rep can open with."
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-stretch gap-[28px]">
          {/* A lead, usually */}
          <div className="min-w-0 border-[1.5px] border-ln-card-border bg-white p-[28px] sm:p-[40px]">
            <div className="mb-[28px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-faint">
              A lead, usually
            </div>
            <div className="flex items-center gap-[16px]">
              <div className="flex size-[64px] shrink-0 items-center justify-center rounded-full bg-ln-rule font-jakarta text-[22px] font-bold text-ln-faint">
                JR
              </div>
              <div className="min-w-0">
                <div className="font-jakarta text-[22px] font-bold">Jordan Reyes</div>
                <div className="break-words text-[16px] text-ln-muted">jordan.reyes@coretide.com</div>
              </div>
            </div>
            <div className="mt-[28px] grid gap-[12px] text-[17px] leading-[1.4]">
              {THIN_ROWS.map((row) => (
                <div key={row.label} className="flex gap-[12px]">
                  <span className="min-w-[90px] text-ln-faint">{row.label}</span>
                  <span className={row.known ? undefined : "text-ln-faint"}>{row.value}</span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-[32px] text-[17px] italic leading-[1.45] text-ln-muted">
              A rep guesses the pain, guesses the timing, and opens with a persona.
            </p>
          </div>

          {/* A Birdsong lead */}
          <div className="relative min-w-0 border-[2.5px] border-ln-ink bg-white p-[28px] shadow-[10px_10px_0_var(--ln-green)] sm:p-[40px]">
            <div
              aria-hidden="true"
              className="absolute -top-[22px] right-[28px] flex size-[60px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-ln-green-pale font-jakarta text-[24px] font-extrabold"
            >
              ♪
            </div>
            <div className="mb-[28px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green">
              A Birdsong lead
            </div>
            <div className="flex flex-wrap items-center gap-[16px]">
              <div className="flex size-[64px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-ln-sage font-jakarta text-[22px] font-extrabold">
                SO
              </div>
              <div className="min-w-[160px] flex-1">
                <div className="font-jakarta text-[22px] font-bold">Sam Okafor</div>
                <div className="text-[16px] text-ln-muted">Head of Growth · Coretide</div>
              </div>
              <span className="rounded-full border-2 border-ln-ink bg-ln-green-pale px-[14px] py-[6px] font-jakarta text-[15px] font-bold">
                Score 9 / 10
              </span>
            </div>
            <blockquote className="mx-0 my-[28px] text-pretty font-jakarta text-[23px] font-semibold leading-[1.3] tracking-[-0.01em]">
              “We spend our best hours triaging inbound that goes nowhere.”
            </blockquote>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[16px]">
              {FACTS.map((fact) => (
                <div key={fact.label} className={`border-t-[2.5px] pt-[10px] ${fact.rule}`}>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ln-muted">
                    {fact.label}
                  </div>
                  <div className="mt-[4px] text-[16px] font-semibold leading-[1.3]">{fact.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-[28px] bg-ln-cream px-[20px] py-[18px] text-[16px] leading-[1.45]">
              <span className="font-bold text-ln-green">Call opener, generated: </span>
              “You said triage eats your team’s best hours. Walk me through the worst morning, and
              I’ll show you what we’d take off your plate first.”
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
