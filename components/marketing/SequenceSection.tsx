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

// "How it works": the three steps beside the three panels they describe.
//
// This was a 300vh scroller with a sticky inner panel, scrubbed by
// LandingPageShell's scroll handler writing data-step (0/1/2) so one panel
// showed at a time while the page stayed pinned. That pin is gone — the
// section is now ordinary flow at every width, which is what it already
// collapsed to below 1080px. With no active step to single out, every step
// in the rail reads settled rather than one inked in and two greyed back.
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
  return (
    <section id="how" className="relative mx-auto max-w-[1480px] px-6 py-[100px] md:px-10">
      <div className="grid grid-cols-[0.9fr_1.1fr] items-start gap-[72px] lp-stack:grid-cols-1 lp-stack:gap-12">
        <div className="flex flex-col">
          <div className="mb-5 text-[12.5px] font-semibold tracking-[0.14em] text-landing-muted">
            HOW IT WORKS
          </div>
          <h2 className="m-0 mb-[22px] max-w-[20ch] text-balance font-spectral text-[clamp(36px,3.4vw,52px)] font-medium leading-[1.06] tracking-[-0.018em]">
            {headline}
          </h2>
          <p className="m-0 mb-10 max-w-[42ch] text-pretty text-[17.5px] leading-[1.62] text-landing-muted">
            {intro}
          </p>
          <div className="flex flex-col gap-[30px]">
            {steps.map((step) => (
              <div key={step.number}>
                {/* Was a progress bar that filled green as its step became
                    active; with nothing to track it is just the divider it
                    always drew on top of. */}
                <div className="h-px bg-landing-border" />
                <div className="mt-4 flex items-baseline gap-3.5">
                  <span className="font-spectral text-[15px] text-landing-green">{step.number}</span>
                  <div>
                    <div className="font-spectral text-2xl font-semibold tracking-[-0.012em] text-landing-ink">
                      {step.title}
                    </div>
                    <p className="m-0 mt-2 max-w-[36ch] text-[15.5px] leading-[1.6] text-landing-muted">
                      {step.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[22px]">
          <InvitePanelCard data={invite} />
          <TranscriptPanelCard data={transcript} />
          <HandoffPanelCard data={handoff} />
        </div>
      </div>
    </section>
  );
}

function InvitePanelCard({ data }: { data: InvitePanel }) {
  return (
    <div className="flex items-stretch justify-center">
      <div className="flex w-full flex-col rounded-2xl border border-landing-border bg-landing-surface px-10 py-[38px] shadow-[0_18px_50px_rgba(34,30,24,0.07)]">
        <div className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-landing-faint">
          {data.briefLabel}
        </div>
        <div className="font-spectral text-[23px] font-medium tracking-[-0.01em]">{data.brief}</div>
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
            <text x="228" y="34" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-muted)" fontFamily="Inter, sans-serif">
              {data.personaTop}
            </text>
            <circle cx="228" cy="84" r="15" fill="var(--lp-green-bg)" stroke="var(--lp-green)" strokeWidth="1.3" />
            <text x="228" y="88" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-green)" fontFamily="Inter, sans-serif">
              {data.personaMid}
            </text>
            <circle cx="228" cy="138" r="15" fill="var(--lp-surface)" stroke="var(--lp-border)" strokeWidth="1.3" />
            <text x="228" y="142" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-muted)" fontFamily="Inter, sans-serif">
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
      <div className="flex w-full flex-col justify-center rounded-2xl border border-landing-border bg-landing-surface px-9 pb-[30px] pt-8 shadow-[0_18px_50px_rgba(34,30,24,0.07)]">
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
        <div className="rounded-2xl border border-landing-border bg-landing-surface px-[38px] py-[34px] shadow-[0_18px_50px_rgba(34,30,24,0.07)]">
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
