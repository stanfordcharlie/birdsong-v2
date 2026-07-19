"use client";

import { spectral } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

// "How it works" per design_handoff_landing_sections: eggshell ground,
// Spectral headlines, three columns with looping vignettes (radar ping /
// chat exchange / lead card). Used by /landing-page only — landing-page-2
// still renders the older HowItWorksSection. All animation classes (lp-*)
// live in globals.css behind prefers-reduced-motion.

const HAIRLINE_DELAYS = ["0.3s", "0.45s", "0.6s"];
const COLUMN_DELAYS = ["0.05s", "0.15s", "0.25s"];

function StepHairline({ delay }: { delay: string }) {
  return (
    <div className="relative mb-5 h-px overflow-hidden bg-[#e9e3d3]">
      <span className="lp-hf absolute inset-0 bg-[#3a6046]" style={{ transitionDelay: delay }} />
    </div>
  );
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-[18px] text-[13px] font-semibold tracking-[0.08em] text-[#a89d88]">
      {children}
    </div>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-5 font-spectral text-[29px] font-medium text-[#262019]">{children}</h3>
  );
}

function StepBody({ children }: { children: React.ReactNode }) {
  return <p className="text-pretty text-[15.5px] leading-[1.6] text-[#6f6757]">{children}</p>;
}

const FLOAT_CHIP =
  "absolute rounded-full border border-[#e9e3d3] bg-[#fffefa] px-[13px] py-1.5 text-[12.5px] font-medium text-[#262019] shadow-[0_2px_8px_rgba(38,32,25,0.06)]";

export function HowItWorksShowcase() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      id="how"
      ref={ref}
      className={cn(spectral.variable, "mx-auto max-w-[1180px] px-12 pb-[84px] pt-24 max-md:px-8")}
    >
      <div data-reveal className="lp-reveal flex flex-wrap items-end justify-between gap-8">
        <div>
          <div className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#3a6046]">
            How it works
          </div>
          <h2 className="text-balance max-w-[640px] font-spectral text-[clamp(38px,4.5vw,54px)] font-medium leading-[1.08] tracking-[-0.01em] text-[#262019]">
            From first note to booked demo.
          </h2>
        </div>
        <div className="max-w-[300px] pb-2 text-[15px] leading-[1.55] text-[#6f6757]">
          Three steps, one owner: Birdsong. Your team only shows up for the demo.
        </div>
      </div>

      <div className="mt-14 grid grid-cols-3 gap-12 max-lg:grid-cols-1">
        {/* 01 — Invite: radar ping + floating invite/accept chips */}
        <div data-reveal className="lp-reveal" style={{ transitionDelay: COLUMN_DELAYS[0] }}>
          <StepHairline delay={HAIRLINE_DELAYS[0]} />
          <StepNumber>01</StepNumber>
          <div className="relative flex h-[190px] items-center justify-center">
            <span className="lp-ping-ring absolute h-[150px] w-[150px] rounded-full border border-[#3a6046]" />
            <span
              className="lp-ping-ring absolute h-[150px] w-[150px] rounded-full border border-[#3a6046]"
              style={{ animationDelay: "1.5s" }}
            />
            <span
              className="lp-ping-ring absolute h-[150px] w-[150px] rounded-full border border-[#3a6046]"
              style={{ animationDelay: "3s" }}
            />
            <span className="h-3.5 w-3.5 rounded-full bg-[#3a6046]" />
            <span className={cn(FLOAT_CHIP, "lp-loop-chip-a left-[8%] top-[26px]")}>
              VP Sales · invited
            </span>
            <span className={cn(FLOAT_CHIP, "lp-loop-chip-b bottom-6 right-[6%]")}>
              Head of Growth · accepted
            </span>
          </div>
          <StepTitle>Invite</StepTitle>
          <StepBody>
            You pick the audience. Birdsong reaches them directly and invites them into a paid,
            peer-level conversation about their work.
          </StepBody>
        </div>

        {/* 02 — Converse: chat exchange + extracted chips */}
        <div data-reveal className="lp-reveal" style={{ transitionDelay: COLUMN_DELAYS[1] }}>
          <StepHairline delay={HAIRLINE_DELAYS[1]} />
          <StepNumber>02</StepNumber>
          <div className="flex h-[190px] flex-col justify-center gap-[9px] px-1">
            <div className="lp-loop-bub-a max-w-[82%] self-start rounded-[14px] rounded-bl-[4px] border border-[#e9e3d3] bg-[#fffefa] px-3.5 py-[9px] text-[13px] text-[#262019] shadow-[0_2px_8px_rgba(38,32,25,0.05)]">
              Where does inbound break down for you today?
            </div>
            <div className="lp-loop-bub-b max-w-[82%] self-end rounded-[14px] rounded-br-[4px] bg-[#3a6046] px-3.5 py-[9px] text-[13px] text-[#f2f6ef]">
              Manual triage. Everything sits for days.
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="lp-loop-exchip-1 rounded-full bg-[#e4ecdd] px-3 py-[5px] text-xs font-semibold text-[#3a6046]">
                Pain: manual inbound triage
              </span>
              <span className="lp-loop-exchip-2 rounded-full bg-[#e4ecdd] px-3 py-[5px] text-xs font-semibold text-[#3a6046]">
                Timeline: this quarter
              </span>
            </div>
          </div>
          <StepTitle>Converse</StepTitle>
          <StepBody>
            A real conversation about their work, not a survey. What actually hurts surfaces in
            their own words, weighed against your ICP and scored.
          </StepBody>
        </div>

        {/* 03 — Deliver: lead card with fit badge, drawn check, demo line */}
        <div data-reveal className="lp-reveal" style={{ transitionDelay: COLUMN_DELAYS[2] }}>
          <StepHairline delay={HAIRLINE_DELAYS[2]} />
          <StepNumber>03</StepNumber>
          <div className="flex h-[190px] items-center justify-center">
            <div className="lp-loop-card w-full max-w-[310px] rounded-2xl border border-[#e9e3d3] bg-[#fffefa] px-[22px] py-5 shadow-[0_10px_28px_rgba(38,32,25,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[15.5px] font-semibold text-[#262019]">Coretide</div>
                <span className="lp-loop-badge rounded-full bg-[#e4ecdd] px-3 py-1 text-[12.5px] font-semibold text-[#3a6046]">
                  92 fit
                </span>
              </div>
              <div className="mt-2 flex items-center gap-[7px] text-[13.5px] text-[#6f6757]">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <circle cx="7.5" cy="7.5" r="6.75" stroke="#3a6046" strokeWidth="1.3" />
                  {/* Dashoffset 0 at rest so the check reads fully drawn
                      under reduced motion; the loop redraws it. */}
                  <path
                    className="lp-loop-check"
                    d="M4.6 7.8l2 2 3.8-4.4"
                    stroke="#3a6046"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="22"
                    strokeDashoffset="0"
                  />
                </svg>
                Qualified · routed to Maya
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-[#e9e3d3] pt-3 text-[12.5px] text-[#a89d88]">
                <span className="lp-loop-blink h-1.5 w-1.5 rounded-full bg-[#3a6046]" />
                Demo · Thu 2:30 PM · conversation attached
              </div>
            </div>
          </div>
          <StepTitle>Deliver</StepTitle>
          <StepBody>
            The lead lands qualified and routed to the right rep, with the conversation attached
            and a demo ready to book.
          </StepBody>
        </div>
      </div>
    </section>
  );
}
