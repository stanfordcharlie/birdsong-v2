"use client";

import { spectral } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

// "Everything your team needs" per design_handoff_landing_sections: three
// cells (the old "Booking built in" cell is gone — that feature doesn't
// exist) in a hairline grid, each with a small reveal-driven micro-visual.
// Used by /landing-page only; landing-page-2 keeps FeaturesSection. The
// lp-* animation classes live in globals.css behind prefers-reduced-motion.

const ROUTE_MID_PATH = "M24 40 C 90 40 130 40 190 40";

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

function TranscriptLine({ width, delay }: { width: string; delay: string }) {
  return (
    <div
      className="lp-ln h-[9px] rounded-[5px] bg-[#e9e3d3]"
      style={{ width, transitionDelay: delay }}
    />
  );
}

function ScoreBar({
  label,
  value,
  delay,
  fillOpacity,
  valueMuted,
}: {
  label: string;
  value: number;
  delay: string;
  fillOpacity: number;
  valueMuted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[52px] text-[11.5px] font-semibold tracking-[0.04em] text-[#a89d88]">
        {label}
      </span>
      <div className="h-[7px] flex-1 overflow-hidden rounded-[4px] bg-[#e9e3d3]">
        <div
          className="lp-bar h-full rounded-[4px] bg-[#3a6046]"
          style={{ width: `${value}%`, opacity: fillOpacity, transitionDelay: delay }}
        />
      </div>
      <span
        className={cn(
          "w-6 text-xs font-semibold",
          valueMuted ? "text-[#6f6757]" : "text-[#3a6046]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TeamNeedsGrid() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      id="features"
      ref={ref}
      className={cn(spectral.variable, "mx-auto max-w-[1180px] px-12 pb-[110px] pt-9 max-md:px-8")}
    >
      <h2
        data-reveal
        className="lp-reveal text-balance mb-12 max-w-[760px] font-spectral text-[clamp(38px,4.5vw,54px)] font-medium leading-[1.12] tracking-[-0.01em] text-[#262019]"
      >
        Everything your team needs. Nothing it doesn&apos;t.
      </h2>

      <div
        data-reveal
        className="lp-reveal grid grid-cols-3 gap-px overflow-hidden rounded-[18px] border border-[#e9e3d3] bg-[#e9e3d3] max-lg:grid-cols-1"
        style={{ transitionDelay: "0.1s" }}
      >
        {/* Context, attached — transcript skeleton + transcript pill */}
        <div className="bg-[#faf8f1] px-[42px] py-[38px] transition-colors duration-[250ms] hover:bg-[#fffefa] max-md:px-7">
          <div className="flex h-[86px] max-w-[340px] flex-col justify-center gap-[7px]">
            <TranscriptLine width="88%" delay="0.3s" />
            <TranscriptLine width="64%" delay="0.45s" />
            <div className="flex items-center gap-2">
              <TranscriptLine width="42%" delay="0.6s" />
              <span
                className="lp-ln rounded-full bg-[#e4ecdd] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#3a6046]"
                style={{ transitionDelay: "0.75s" }}
              >
                Full transcript ↗
              </span>
            </div>
          </div>
          <CellTitle>Context, attached</CellTitle>
          <CellBody>
            Every lead arrives with the conversation: what hurts, who is involved, when they want
            to move.
          </CellBody>
        </div>

        {/* Scoring you define — labeled bars filling on reveal */}
        <div className="bg-[#faf8f1] px-[42px] py-[38px] transition-colors duration-[250ms] hover:bg-[#fffefa] max-md:px-7">
          <div className="flex h-[86px] max-w-[340px] flex-col justify-center gap-[11px]">
            <ScoreBar label="ICP FIT" value={92} delay="0.35s" fillOpacity={1} />
            <ScoreBar label="INTENT" value={76} delay="0.5s" fillOpacity={0.75} valueMuted />
            <ScoreBar label="TIMING" value={61} delay="0.65s" fillOpacity={0.5} valueMuted />
          </div>
          <CellTitle>Scoring you define</CellTitle>
          <CellBody>
            Fit is measured against your ICP, in criteria you can read. Not a black-box number.
          </CellBody>
        </div>

        {/* Routing that holds — lead dot routed to Maya */}
        <div className="bg-[#faf8f1] px-[42px] py-[38px] transition-colors duration-[250ms] hover:bg-[#fffefa] max-md:px-7">
          <div className="relative flex h-[86px] items-center">
            <svg width="300" height="80" viewBox="0 0 300 80" fill="none" className="overflow-visible" aria-hidden="true">
              <path d="M24 40 C 90 40 120 16 190 16" stroke="#e9e3d3" strokeWidth="1.5" />
              <path d={ROUTE_MID_PATH} stroke="#3a6046" strokeWidth="1.5" opacity="0.55" />
              <path d="M24 40 C 90 40 120 64 190 64" stroke="#e9e3d3" strokeWidth="1.5" />
              <circle cx="24" cy="40" r="7" fill="#3a6046" />
              <circle cx="196" cy="16" r="11" fill="#faf8f1" stroke="#e9e3d3" strokeWidth="1.5" />
              <text x="196" y="20" textAnchor="middle" fontSize="10" fontWeight="600" fill="#a89d88" fontFamily="inherit">
                A
              </text>
              <circle cx="196" cy="40" r="11" fill="#e4ecdd" stroke="#3a6046" strokeWidth="1.5" />
              <text x="196" y="44" textAnchor="middle" fontSize="10" fontWeight="600" fill="#3a6046" fontFamily="inherit">
                M
              </text>
              <circle cx="196" cy="64" r="11" fill="#faf8f1" stroke="#e9e3d3" strokeWidth="1.5" />
              <text x="196" y="68" textAnchor="middle" fontSize="10" fontWeight="600" fill="#a89d88" fontFamily="inherit">
                J
              </text>
              <text x="216" y="44" fontSize="11.5" fontWeight="500" fill="#6f6757" fontFamily="inherit">
                Maya · West
              </text>
            </svg>
            {/* Travels the middle path on a 5s loop; hidden at rest and
                under reduced motion (globals.css). */}
            <span
              className="lp-route-dot absolute h-[9px] w-[9px] rounded-full bg-[#3a6046]"
              style={{ offsetPath: `path('${ROUTE_MID_PATH}')` }}
            />
          </div>
          <CellTitle>Routing that holds</CellTitle>
          <CellBody>Territory, segment, round-robin. The right rep gets the lead the first time.</CellBody>
        </div>
      </div>
    </section>
  );
}
