"use client";

import { spectral } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

// "Asked, not inferred." per design_handoff_landing_sections_cs: 2×2
// hairline grid on /landing-page-2, each cell an 86px micro-visual +
// Spectral heading + body. The lp-* reveal/loop classes live in
// globals.css behind prefers-reduced-motion — reduced-motion users see
// static visuals (grey dot grid, plain dashed line, solid green dot).

// Scattered per-dot pulse delays from the design artifact (12×3 grid) —
// the scatter is what makes the pulse read as a wave across the base.
const BASE_DOT_DELAYS = [
  0, 2.7, 5.4, 1.1, 3.8, 6.5, 2.2, 4.9, 0.6, 3.3, 6, 1.7, 4.4, 0.1, 2.8, 5.5, 1.2, 3.9, 6.6, 2.3,
  5, 0.7, 3.4, 6.1, 1.8, 4.5, 0.2, 2.9, 5.6, 1.3, 4, 6.7, 2.4, 5.1, 0.8, 3.5,
];

const CELL_CLASSES =
  "bg-[#faf8f1] px-[42px] py-[38px] transition-colors duration-[250ms] hover:bg-[#fffefa] max-md:px-7";

function CellTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 mt-[18px] font-spectral text-[26px] font-medium text-[#262019]">
      {children}
    </h3>
  );
}

function CellBody({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-pretty max-w-[420px] text-[15px] leading-[1.6] text-[#6f6757]">{children}</p>
  );
}

export function AskedNotInferredGrid() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      id="features"
      ref={ref}
      className={cn(spectral.variable, "mx-auto max-w-[1360px] px-12 pb-[110px] pt-9 max-md:px-8")}
    >
      <h2
        data-reveal
        className="lp-reveal text-balance mb-12 max-w-[760px] font-spectral text-[clamp(38px,4.5vw,54px)] font-medium leading-[1.12] tracking-[-0.01em] text-[#262019]"
      >
        Asked, not inferred.
      </h2>

      <div
        data-reveal
        className="lp-reveal grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-[#e9e3d3] bg-[#e9e3d3] max-lg:grid-cols-1"
        style={{ transitionDelay: "0.1s" }}
      >
        {/* Beyond the health score — comparison sliding in on reveal */}
        <div className={CELL_CLASSES}>
          <div className="flex h-[86px] items-center gap-3">
            <div
              className="lp-ln rounded-[10px] border border-[#e9e3d3] bg-[#fffefa] px-3.5 py-2 text-[12.5px] text-[#a89d88]"
              style={{ transitionDelay: "0.3s" }}
            >
              Health score <b className="font-semibold text-[#6f6757]">72 · fine</b>
            </div>
            <svg
              width="22"
              height="12"
              viewBox="0 0 22 12"
              fill="none"
              aria-hidden="true"
              className="lp-ln shrink-0"
              style={{ transitionDelay: "0.45s" }}
            >
              <path
                d="M1 6h18m0 0l-4-4.5M19 6l-4 4.5"
                stroke="#a89d88"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <div
              className="lp-ln rounded-full bg-[#e4ecdd] px-3.5 py-2 text-[12.5px] font-semibold text-[#3a6046]"
              style={{ transitionDelay: "0.6s" }}
            >
              Two departments asking for seats
            </div>
          </div>
          <CellTitle>Beyond the health score</CellTitle>
          <CellBody>
            Usage data guesses. A conversation hears the two departments asking for seats.
          </CellBody>
        </div>

        {/* Trust, kept intact — CSM↔Acct warm line, research node apart */}
        <div className={CELL_CLASSES}>
          <div className="flex h-[86px] items-center">
            <svg width="300" height="80" viewBox="0 0 300 80" fill="none" className="overflow-visible" aria-hidden="true">
              <path d="M42 30 H 172" stroke="#3a6046" strokeWidth="1.5" opacity="0.55" />
              <path
                className="lp-dash-flow"
                d="M107 62 C 130 62 150 44 172 34"
                stroke="#a89d88"
                strokeWidth="1.3"
                strokeDasharray="4 5"
              />
              <circle cx="30" cy="30" r="12" fill="#e4ecdd" stroke="#3a6046" strokeWidth="1.5" />
              <text x="30" y="34" textAnchor="middle" fontSize="9" fontWeight="600" fill="#3a6046" fontFamily="inherit">
                CSM
              </text>
              <circle cx="184" cy="30" r="12" fill="#faf8f1" stroke="#e9e3d3" strokeWidth="1.5" />
              <text x="184" y="34" textAnchor="middle" fontSize="9" fontWeight="600" fill="#6f6757" fontFamily="inherit">
                Acct
              </text>
              <circle cx="88" cy="62" r="11" fill="#fffefa" stroke="#e9e3d3" strokeWidth="1.5" />
              <text x="88" y="65.5" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#a89d88" fontFamily="inherit">
                ♫
              </text>
              <text x="106" y="79" fontSize="10.5" fontWeight="500" fill="#a89d88" fontFamily="inherit">
                Research, apart
              </text>
              <text x="82" y="20" fontSize="10.5" fontWeight="500" fill="#6f6757" fontFamily="inherit">
                Relationship, warm
              </text>
            </svg>
          </div>
          <CellTitle>Trust, kept intact</CellTitle>
          <CellBody>
            Your CSMs never have to pitch mid-relationship. The research stands apart, so the
            relationship stays warm.
          </CellBody>
        </div>

        {/* The whole base, heard — 12×3 dot grid pulsing in a wave */}
        <div className={CELL_CLASSES}>
          <div className="flex h-[86px] items-center">
            <div className="grid grid-cols-[repeat(12,10px)] gap-[9px]">
              {BASE_DOT_DELAYS.map((delay, i) => (
                <span
                  key={i}
                  className="lp-base-dot h-[10px] w-[10px] rounded-full bg-[#e9e3d3]"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
          <CellTitle>The whole base, heard</CellTitle>
          <CellBody>
            Real conversations for the hundreds of accounts tech touch never reaches, not just the
            ones with a CSM.
          </CellBody>
        </div>

        {/* Paced for people — yearly-cadence timeline */}
        <div className={CELL_CLASSES}>
          <div className="flex h-[86px] items-center">
            <div className="relative h-10 w-full max-w-[320px]">
              <div className="absolute inset-x-0 top-[19px] h-px bg-[#e9e3d3]" />
              <span className="absolute left-[8%] top-4 h-[7px] w-[7px] rounded-full bg-[#e9e3d3]" />
              <span className="absolute left-[30%] top-4 h-[7px] w-[7px] rounded-full bg-[#e9e3d3]" />
              <span className="absolute left-[74%] top-4 h-[7px] w-[7px] rounded-full bg-[#e9e3d3]" />
              <span className="lp-year-pulse absolute left-[52%] top-[13px] h-[13px] w-[13px] rounded-full bg-[#3a6046]" />
              <span className="absolute left-[52%] top-[34px] -translate-x-[42%] whitespace-nowrap text-[11.5px] font-semibold text-[#3a6046]">
                One good conversation a year
              </span>
            </div>
          </div>
          <CellTitle>Paced for people</CellTitle>
          <CellBody>
            Occasional and meaningful by design. One good conversation a year beats a survey every
            quarter.
          </CellBody>
        </div>
      </div>
    </section>
  );
}
