"use client";

import { useEffect, useState } from "react";
import { BirdLogo } from "./BirdLogo";
import { PerchedBird } from "./PerchedBird";

// Phase order: 0 joining, 1 question, 2 typing, 3 answer, 4 done,
// 5 delivered, 6 qualified, 7 cta, 8 booked/routed, 9 hold (then loops).
const DURATIONS = [2600, 3200, 2000, 4800, 2600, 3000, 2600, 2200, 5200, 1400];

export type ProductDemoContent = {
  sessionSubtitle: string;
  questionProgressLabel: string;
  joiningLine: string;
  question: string;
  answer: string;
  doneLabel: string;
  teamLabel: string;
  avatarInitials: string;
  personName: string;
  personMeta: string;
  conversationMeta: string;
  extractedChip: string;
  scoreFieldLabel: string;
  qualifiedScoreWidth: string;
  qualifiedScoreLabel: string;
  qualifiedBadgeLabel: string;
  ctaButtonLabel: string;
  successLine: string;
};

export function ProductDemo({ content }: { content: ProductDemoContent }) {
  const [phase, setPhase] = useState(0);
  const [motionReduced, setMotionReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) {
      setMotionReduced(true);
      setPhase(8);
    }
  }, []);

  useEffect(() => {
    if (motionReduced) return;
    const id = setTimeout(() => {
      setPhase((p) => (p + 1) % DURATIONS.length);
    }, DURATIONS[phase]);
    return () => clearTimeout(id);
  }, [phase, motionReduced]);

  const sessionOn = phase <= 4;
  const joining = phase === 0;
  const sessionStatus =
    phase === 0 ? "Invited" : phase >= 4 ? "Complete" : content.questionProgressLabel;
  const qOn = phase >= 1 && phase <= 4;
  const typing = phase === 2;
  const aOn = phase >= 3 && phase <= 4;
  const doneOn = phase === 4;
  const teamOn = phase >= 5;
  const painOn = phase >= 5;
  const scoreOn = phase >= 5;
  const qualified = phase >= 6;
  const scoreWidth = qualified ? content.qualifiedScoreWidth : "12%";
  const scoreLabel = qualified ? content.qualifiedScoreLabel : "…";
  const ctaOn = phase >= 7;
  const booked = phase >= 8;
  const notBooked = phase === 7;

  return (
    <div
      className="relative mx-auto mt-14 max-w-[760px] px-8"
      style={{ animation: "fadeUp 0.9s 0.34s both" }}
    >
      <PerchedBird />
      <div className="overflow-hidden rounded-xl border border-[rgba(33,29,22,0.14)] bg-[#FDFDFC] shadow-[0_24px_60px_-24px_rgba(33,29,22,0.28)]">
        <div className="flex items-center gap-2 border-b border-[rgba(33,29,22,0.08)] px-4 py-3">
          <span className="h-[9px] w-[9px] rounded-full bg-[rgba(33,29,22,0.14)]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[rgba(33,29,22,0.14)]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[rgba(33,29,22,0.14)]" />
          <span className="ml-2.5 text-[12.5px] text-[#8A8271]">Birdsong</span>
        </div>

        <div className="min-h-[300px] px-6 py-[22px] text-left">
          {sessionOn && (
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-[rgba(33,29,22,0.08)] pb-3.5">
                <div>
                  <div className="text-[15px] font-semibold text-[#1a1a1a]">
                    Industry conversation
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-[#6b7280]">
                    {content.sessionSubtitle}
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full border border-[#D3DECF] bg-[#E9EFE6] px-[9px] py-1 text-[11.5px] font-semibold text-[#33684B]">
                  {sessionStatus}
                </span>
              </div>

              <div className="mt-4 flex min-h-[150px] flex-col gap-2.5">
                {joining && (
                  <div className="flex items-center gap-2.5 px-0.5 py-1.5 text-[13.5px] text-[#8A8271]">
                    <span
                      className="h-2 w-2 rounded-full bg-[#33684B] motion-reduce:![animation:none]"
                      style={{ animation: "blinkDot 1.6s infinite" }}
                    />
                    {content.joiningLine}
                  </div>
                )}
                {qOn && (
                  <div
                    className="flex items-end gap-2"
                    style={{ animation: "fadeUp 0.4s both" }}
                  >
                    <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#211D16]">
                      <BirdLogo size={14} fill="#F5EFE3" showEye={false} />
                    </span>
                    <div className="max-w-[75%] rounded-[12px_12px_12px_4px] bg-[#f4f4f5] px-[13px] py-[9px] text-[13.5px] leading-[1.5] text-[#1a1a1a]">
                      {content.question}
                    </div>
                  </div>
                )}
                {typing && (
                  <div
                    className="flex gap-1 self-end rounded-[12px_12px_4px_12px] border border-[#D3DECF] bg-[#E9EFE6] px-3.5 py-3"
                    style={{ animation: "fadeUp 0.3s both" }}
                  >
                    <span
                      className="h-[5px] w-[5px] rounded-full bg-[#5D5748] motion-reduce:![animation:none]"
                      style={{ animation: "blinkDot 1.2s infinite" }}
                    />
                    <span
                      className="h-[5px] w-[5px] rounded-full bg-[#5D5748] motion-reduce:![animation:none]"
                      style={{ animation: "blinkDot 1.2s 0.2s infinite" }}
                    />
                    <span
                      className="h-[5px] w-[5px] rounded-full bg-[#5D5748] motion-reduce:![animation:none]"
                      style={{ animation: "blinkDot 1.2s 0.4s infinite" }}
                    />
                  </div>
                )}
                {aOn && (
                  <div
                    className="max-w-[78%] self-end rounded-[12px_12px_4px_12px] border border-[#D3DECF] bg-[#E9EFE6] px-[13px] py-[9px] text-[13.5px] leading-[1.5] text-[#1a1a1a]"
                    style={{ animation: "fadeUp 0.4s both" }}
                  >
                    {content.answer}
                  </div>
                )}
                {doneOn && (
                  <div
                    className="mt-1.5 text-center text-[12.5px] text-[#8A8271]"
                    style={{ animation: "fadeUp 0.4s both" }}
                  >
                    {content.doneLabel}
                  </div>
                )}
              </div>
            </div>
          )}

          {teamOn && (
            <div style={{ animation: "fadeUp 0.45s both" }}>
              <div className="mb-3 text-[11px] uppercase tracking-[0.09em] text-[#8A8271]">
                {content.teamLabel}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#EEEAE0] text-[13px] font-semibold text-[#5D5748]">
                    {content.avatarInitials}
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-[#1a1a1a]">
                      {content.personName}
                    </div>
                    <div className="text-[13px] text-[#6b7280]">{content.personMeta}</div>
                  </div>
                </div>
                <span
                  className={
                    qualified
                      ? "rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[11.5px] font-semibold text-[#15803d]"
                      : "rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-2.5 py-1 text-[11.5px] font-semibold text-[#6b7280]"
                  }
                >
                  {qualified ? content.qualifiedBadgeLabel : "Scoring"}
                </span>
              </div>
              <div className="mt-3.5 text-[13px] text-[#6b7280]">{content.conversationMeta}</div>

              {painOn && (
                <div className="mt-3.5" style={{ animation: "fadeUp 0.4s both" }}>
                  <div className="mb-[7px] text-[11px] uppercase tracking-[0.09em] text-[#8A8271]">
                    From the conversation
                  </div>
                  <span className="inline-block rounded-lg border border-[#e4e4e7] bg-[#f4f4f5] px-2.5 py-[5px] text-[12.5px] text-[#374151]">
                    {content.extractedChip}
                  </span>
                </div>
              )}

              {scoreOn && (
                <div className="mt-[18px]" style={{ animation: "fadeUp 0.4s both" }}>
                  <div className="mb-1.5 flex justify-between text-[12.5px] text-[#6b7280]">
                    <span>{content.scoreFieldLabel}</span>
                    <span className="font-semibold text-[#1a1a1a]">{scoreLabel}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f4f4f5]">
                    <div
                      className="h-full rounded-full bg-[#33684B] transition-[width] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
                      style={{ width: scoreWidth }}
                    />
                  </div>
                </div>
              )}

              {ctaOn && (
                <div className="mt-[22px]" style={{ animation: "fadeUp 0.4s both" }}>
                  {booked ? (
                    <div className="flex items-center gap-2.5 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3.5 py-[11px] text-sm text-[#1a1a1a]">
                      <span className="font-bold text-[#16a34a]">✓</span>
                      {content.successLine}
                    </div>
                  ) : notBooked ? (
                    <button
                      type="button"
                      className="rounded-lg bg-[#4f46e5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338ca]"
                    >
                      {content.ctaButtonLabel}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
