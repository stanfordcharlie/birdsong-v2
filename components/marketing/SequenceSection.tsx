import { Starburst } from "./Starburst";

export type SequenceStep = { number: string; title: string; body: string };

export type InvitePanel = {
  briefLabel: string;
  brief: string;
  personaTop: string;
  personaMid: string;
  personaBottom: string;
  chipA: string;
  chipB: string;
  stats: [string, string, string];
};

export type TranscriptPanel = {
  label: string;
  followUps: string;
  exchange: [string, string, string, string];
  tags: [string, string, string];
};

export type HandoffPanel = {
  name: string;
  title: string;
  scoreLabel: string;
  quote: string;
  facts: [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }];
  calloutLabel: string;
  calloutText: string;
  stickerLabel: string;
};

// "How it works": three static rows, each pairing a step with the panel it
// describes.
//
// This was a 300vh scroller with a sticky inner panel, scrubbed by
// LandingPageShell's scroll handler writing data-step (0/1/2) so one panel
// showed at a time while the page stayed pinned. v2 drops the pin and the
// step rail both: a header row, then one row per step, each with its own
// hairline above it. The step's text and its panel now sit on the same
// baseline instead of running as two parallel columns, so a reader never
// has to count down the rail to work out which panel belongs to which step.
export function SequenceSection({
  headline,
  intro,
  steps,
  invite,
  transcript,
  handoff,
}: {
  headline: string;
  intro: string;
  steps: [SequenceStep, SequenceStep, SequenceStep];
  invite: InvitePanel;
  transcript: TranscriptPanel;
  handoff: HandoffPanel;
}) {
  const panels = [
    <InvitePanelCard key="invite" data={invite} />,
    <TranscriptPanelCard key="transcript" data={transcript} />,
    <HandoffPanelCard key="handoff" data={handoff} />,
  ];

  return (
    <section id="how" className="relative">
      <div className="mx-auto max-w-[1480px] px-6 pt-[104px] md:px-10">
        <div
          data-reveal
          className="grid grid-cols-[1.05fr_1fr] items-end gap-16 lp-stack:grid-cols-1 lp-stack:gap-8"
        >
          <div>
            <div className="mb-[18px] text-[12.5px] font-bold tracking-[0.14em] text-landing-muted">
              HOW IT WORKS
            </div>
            <h2 className="m-0 max-w-[16ch] text-balance font-bricolage text-[clamp(38px,3.9vw,60px)] font-bold leading-none tracking-[-0.035em]">
              {headline}
            </h2>
          </div>
          <p className="m-0 mb-1.5 max-w-[44ch] text-pretty text-[17.5px] leading-[1.6] text-landing-muted">
            {intro}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 pb-[104px] pt-11 md:px-10">
        {steps.map((step, i) => (
          <div
            key={step.number}
            data-reveal
            className="grid grid-cols-[0.85fr_1.15fr] items-center gap-[76px] border-t border-landing-hair py-[62px] lp-stack:grid-cols-1 lp-stack:gap-[30px] lp-stack:py-11"
          >
            {/* Badge, title and copy all start at the same left edge: no
                indent under the badge, which is what makes the three rows
                read as one column of steps rather than three cards. */}
            <div>
              <span className="inline-flex h-[38px] min-w-10 items-center justify-center rounded-full border-2 border-landing-ink bg-landing-green px-2 font-bricolage text-[16px] font-bold tracking-[-0.02em] text-white shadow-[3px_3px_0_var(--lp-ink)]">
                {step.number}
              </span>
              <h3 className="m-0 mt-[22px] max-w-[16ch] text-balance font-bricolage text-[clamp(28px,2.5vw,38px)] font-bold leading-[1.04] tracking-[-0.032em]">
                {step.title}
              </h3>
              <p className="m-0 mt-3.5 max-w-[38ch] text-pretty text-[17px] leading-[1.6] text-landing-muted">
                {step.body}
              </p>
            </div>
            {panels[i]}
          </div>
        ))}
      </div>
    </section>
  );
}

function InvitePanelCard({ data }: { data: InvitePanel }) {
  return (
    <div className="flex items-stretch justify-center">
      <div className="flex w-full flex-col rounded-[18px] border-2 border-landing-ink bg-landing-surface px-10 py-[38px] shadow-[8px_8px_0_var(--lp-ink)]">
        <div className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-landing-faint">
          {data.briefLabel}
        </div>
        <div className="font-bricolage text-2xl font-bold tracking-[-0.025em]">{data.brief}</div>
        <div className="relative mt-3.5 flex min-h-[210px] flex-1 items-center justify-center">
          <svg width="330" height="180" viewBox="0 0 290 168" fill="none" aria-hidden="true" className="max-w-full overflow-visible">
            <path
              d="M52 84 C 115 84 155 30 212 30"
              stroke="var(--lp-faint)"
              strokeWidth="1.3"
              strokeDasharray="4 6"
              className="motion-safe:animate-[lp-dash-flow_1.5s_linear_infinite]"
            />
            <path
              d="M52 84 H 212"
              stroke="var(--lp-green)"
              strokeWidth="1.3"
              strokeDasharray="4 6"
              opacity=".8"
              className="motion-safe:animate-[lp-dash-flow_1.5s_linear_0.4s_infinite]"
            />
            <path
              d="M52 84 C 115 84 155 138 212 138"
              stroke="var(--lp-faint)"
              strokeWidth="1.3"
              strokeDasharray="4 6"
              className="motion-safe:animate-[lp-dash-flow_1.5s_linear_0.8s_infinite]"
            />
            <circle cx="36" cy="84" r="15" fill="var(--lp-green)" />
            <text x="36" y="89" textAnchor="middle" fontSize="13" fill="var(--lp-bg)">
              ♪
            </text>
            <circle cx="228" cy="30" r="15" fill="var(--lp-surface)" stroke="var(--lp-border)" strokeWidth="1.3" />
            <text x="228" y="34" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-muted)" fontFamily="var(--font-dm-sans), sans-serif">
              {data.personaTop}
            </text>
            <circle cx="228" cy="84" r="15" fill="var(--lp-green-bg)" stroke="var(--lp-green)" strokeWidth="1.3" />
            <text x="228" y="88" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-green)" fontFamily="var(--font-dm-sans), sans-serif">
              {data.personaMid}
            </text>
            <circle cx="228" cy="138" r="15" fill="var(--lp-surface)" stroke="var(--lp-border)" strokeWidth="1.3" />
            <text x="228" y="142" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-muted)" fontFamily="var(--font-dm-sans), sans-serif">
              {data.personaBottom}
            </text>
          </svg>
          <div className="absolute left-0 top-4 rounded-full border border-landing-border bg-landing-surface px-3.5 py-[7px] text-[12.5px] font-medium shadow-[0_2px_8px_rgba(34,30,24,0.05)] motion-safe:animate-[lp-invite-chip-a_9s_ease_infinite]">
            {data.chipA}
          </div>
          <div className="absolute bottom-3.5 right-0 rounded-full border border-landing-border bg-landing-surface px-3.5 py-[7px] text-[12.5px] font-medium shadow-[0_2px_8px_rgba(34,30,24,0.05)] motion-safe:animate-[lp-invite-chip-b_9s_ease_infinite]">
            {data.chipB}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-[26px] gap-y-2 border-t border-landing-hair pt-5 text-[13.5px] text-landing-muted">
          {data.stats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TranscriptPanelCard({ data }: { data: TranscriptPanel }) {
  return (
    <div className="flex items-stretch justify-center">
      <div className="flex w-full flex-col justify-center rounded-[18px] border-2 border-landing-ink bg-landing-surface px-9 pb-[30px] pt-8 shadow-[8px_8px_0_var(--lp-ink)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="text-[12px] font-semibold tracking-[0.12em] text-landing-faint">
            {data.label}
          </div>
          <div className="shrink-0 text-[13px] text-landing-muted">{data.followUps}</div>
        </div>
        <div className="flex flex-col gap-3.5">
          {data.exchange.map((line, i) =>
            i % 2 === 0 ? (
              <div
                key={line}
                className="max-w-[86%] self-start rounded-[13px_13px_13px_4px] bg-landing-sunk px-[17px] py-[13px] text-[15px] leading-[1.55]"
              >
                {line}
              </div>
            ) : (
              <div
                key={line}
                className="max-w-[86%] self-end rounded-[13px_13px_4px_13px] bg-landing-green px-[17px] py-[13px] text-[15px] leading-[1.55] text-[#f3f6f0]"
              >
                {line}
              </div>
            )
          )}
        </div>
        <div className="mt-[22px] flex flex-wrap gap-[9px] border-t border-landing-hair pt-[18px]">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-landing-green-bg px-[13px] py-1.5 text-[12.5px] font-medium text-landing-green-deep"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HandoffPanelCard({ data }: { data: HandoffPanel }) {
  return (
    <div className="flex items-stretch justify-center">
      <div className="relative flex w-full flex-col justify-center">
        <div className="rounded-[18px] border-2 border-landing-ink bg-landing-surface px-[38px] py-[34px] shadow-[8px_8px_0_var(--lp-ink)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">{data.name}</div>
              <div className="mt-[3px] text-sm text-landing-muted">{data.title}</div>
            </div>
            <span className="shrink-0 rounded-full bg-landing-green-bg px-4 py-[7px] text-[13.5px] font-semibold text-landing-green-deep motion-safe:animate-[lp-badge-pop_9s_cubic-bezier(0.34,1.56,0.64,1)_infinite]">
              {data.scoreLabel}
            </span>
          </div>
          <div className="mt-[22px] max-w-[36ch] font-spectral text-[21px] italic leading-[1.5] text-landing-ink-soft">
            {data.quote}
          </div>
          <div className="mt-[22px] grid grid-cols-3 gap-5 border-t border-landing-hair pt-5 lp-mobile:grid-cols-1 lp-mobile:gap-3">
            {data.facts.map((fact) => (
              <div key={fact.label}>
                <div className="mb-1.5 text-[11.5px] font-semibold tracking-[0.1em] text-landing-faint">
                  {fact.label}
                </div>
                <div className="text-[14.5px] leading-[1.5] text-landing-ink-soft">{fact.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-[22px] rounded-[10px] bg-landing-green-bg px-5 py-[18px] text-[14.5px] leading-[1.6] text-landing-green-deep">
            <span className="font-semibold">{data.calloutLabel} </span>
            {data.calloutText}
          </div>
        </div>
        <Starburst
          label={data.stickerLabel}
          size={80}
          rotationDeg={7}
          fillClassName="fill-landing-blue-bg"
          labelClassName="text-[13.5px]"
          className="absolute -right-[22px] -top-[26px]"
        />
      </div>
    </div>
  );
}
