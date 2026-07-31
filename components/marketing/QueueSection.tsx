"use client";

import { useState } from "react";

export type QueueRow = { name: string; subtitle: string; score: string };

export type QueuePanel = {
  verdict: string;
  scoreLabel: string;
  // Score pill tint: green for a route-now, butter for a hold, neutral for
  // a scored no.
  scoreTone: "green" | "butter" | "neutral";
  quote: string;
  facts: [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }];
  calloutLabel: string;
  calloutText: string;
};

const SCORE_TONE = {
  green: "bg-landing-green-bg text-landing-green-deep",
  butter: "bg-landing-butter-bg text-landing-butter-deep",
  neutral: "bg-[rgba(238,242,234,0.14)] text-[rgba(238,242,234,0.85)]",
} as const;

// The ink-green "handoff" band: pick a respondent on the left, read what
// the rep actually opens on the right. The only stateful piece on either
// landing page, so it is the only client component among the sections.
export function QueueSection({
  headline,
  intro,
  rows,
  footnote,
  panels,
}: {
  headline: string;
  intro: string;
  rows: [QueueRow, QueueRow, QueueRow];
  footnote: string;
  panels: [QueuePanel, QueuePanel, QueuePanel];
}) {
  const [selected, setSelected] = useState(0);
  const panel = panels[selected];

  return (
    <section id="queue" className="bg-landing-green-deep text-[#eef2ea]">
      <div className="mx-auto max-w-[1480px] px-6 pb-[108px] pt-[104px] md:px-10">
        <div
          data-reveal
          className="mb-14 grid grid-cols-[1.1fr_1fr] items-end gap-16 lp-stack:grid-cols-1 lp-stack:gap-6"
        >
          <div>
            <div className="mb-5 text-[12.5px] font-semibold tracking-[0.14em] text-[rgba(238,242,234,0.6)]">
              THE HANDOFF
            </div>
            <h2 className="m-0 max-w-[22ch] text-balance font-spectral text-[clamp(34px,3.3vw,50px)] font-medium leading-[1.07] tracking-[-0.018em] text-[#f4f7f1]">
              {headline}
            </h2>
          </div>
          <p className="m-0 mb-1.5 max-w-[44ch] text-pretty text-[17px] leading-[1.62] text-[rgba(238,242,234,0.72)]">
            {intro}
          </p>
        </div>

        <div className="grid grid-cols-[0.78fr_1.22fr] items-start gap-12 lp-stack:grid-cols-1 lp-stack:gap-8">
          <div data-reveal style={{ transitionDelay: "0.06s" }}>
            {rows.map((row, i) => (
              <button
                key={row.name}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={selected === i}
                data-on={selected === i ? "1" : "0"}
                className="lp-qrow"
              >
                <span>
                  <span className="block text-[16.5px] font-semibold">{row.name}</span>
                  <span className="mt-1 block text-[13.5px] text-[rgba(238,242,234,0.62)]">
                    {row.subtitle}
                  </span>
                </span>
                <span className="font-spectral text-[19px]">{row.score}</span>
              </button>
            ))}
            <div className="border-t border-landing-green-line px-1 pt-[19px] text-[13px] text-[rgba(238,242,234,0.5)]">
              {footnote}
            </div>
          </div>

          <div data-reveal style={{ transitionDelay: "0.14s" }}>
            {/* Keyed by selection so the panel-in animation replays on each
                pick rather than only on first mount. */}
            <div
              key={selected}
              className="lp-qpanel rounded-2xl border border-landing-green-line bg-[rgba(255,254,250,0.05)] px-[38px] py-[34px] lp-mobile:px-6 lp-mobile:py-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="font-spectral text-[27px] font-medium tracking-[-0.012em] text-[#f4f7f1]">
                  {panel.verdict}
                </div>
                <span
                  className={`shrink-0 rounded-full px-4 py-[7px] text-[13.5px] font-semibold ${SCORE_TONE[panel.scoreTone]}`}
                >
                  {panel.scoreLabel}
                </span>
              </div>
              <div className="mt-[22px] max-w-[38ch] font-spectral text-[22px] italic leading-[1.5] text-[#f4f7f1]">
                {panel.quote}
              </div>
              <div className="mt-[26px] grid grid-cols-3 gap-[22px] border-t border-landing-green-line pt-[22px] lp-mobile:grid-cols-1 lp-mobile:gap-4">
                {panel.facts.map((fact) => (
                  <div key={fact.label}>
                    <div className="mb-[7px] text-[11.5px] font-semibold tracking-[0.1em] text-[rgba(238,242,234,0.5)]">
                      {fact.label}
                    </div>
                    <div className="text-[14.5px] leading-[1.55] text-[rgba(238,242,234,0.86)]">
                      {fact.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-[26px] rounded-[10px] bg-[rgba(233,239,228,0.1)] px-5 py-[18px] text-[14.5px] leading-[1.6] text-[rgba(238,242,234,0.9)]">
                <span className="font-semibold">{panel.calloutLabel} </span>
                {panel.calloutText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
