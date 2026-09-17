"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Product: a pinned pale-green panel holding four stacked white mocks,
 * paired with four steps that scroll past it.
 *
 * The only interactive thing on `/`, which is why this is the one client
 * component. An IntersectionObserver with a -45%/-45% rootMargin means a step
 * becomes active once it reaches the middle band of the viewport; `active`
 * then drives both the step opacity and which mock is visible.
 *
 * Below 900px that pairing cannot work: the panel would sit above the steps
 * rather than beside them, so three of the four mocks would swap in while
 * scrolled off-screen and never be seen at all. So each step carries its own
 * mock inline instead, and the pinned panel is dropped. The mock elements are
 * declared once on STEPS and rendered in both places — the same element object
 * in two parents, which React is happy to do — so there is one definition of
 * each mock, not a phone copy drifting from a desktop copy.
 */

function Chip({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <span
      className={
        selected
          ? "rounded-[5px] border border-hp-green-line bg-hp-green-tint px-[10px] py-[6px] text-[14px] text-hp-green"
          : "rounded-[5px] border border-hp-line-soft px-[10px] py-[6px] text-[14px] text-hp-body"
      }
    >
      {label} ✕
    </span>
  );
}

function ScoreRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[84px_minmax(0,1fr)] gap-[12px] hp-wide:grid-cols-[120px_minmax(0,1fr)] ${
        last ? "" : "border-b border-hp-line-faint pb-[14px]"
      }`}
    >
      <span className="text-hp-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * The white card. `gap` is per-mock rather than a class because each mock
 * spaces its own rows differently; everything else about the card is shared.
 */
function MockCard({ gap, children }: { gap: string; children: React.ReactNode }) {
  return (
    <div
      className="flex h-full flex-col justify-start rounded-tl-[10px] bg-white px-[24px] py-[28px] shadow-hp-mock hp-wide:px-[48px] hp-wide:py-[44px]"
      style={{ gap }}
    >
      {children}
    </div>
  );
}

const STEPS = [
  {
    title: "Define Your Audience",
    body: "Start with who you want to hear from. Role, company size, market. Sharp and specific. You own the brief.",
    gap: "22px",
    mock: (
      <>
        <div className="text-[22px] tracking-[-0.01em]">Describe your audience</div>
        <div className="rounded-[6px] border border-hp-line-soft px-[16px] py-[14px] text-[16px] leading-[1.45] text-hp-muted">
          Revenue leaders at 50–500 seat B2B software companies. Owns inbound. Evaluating tooling
          this quarter.
        </div>
        <div className="flex flex-col gap-[12px]">
          <div className="flex justify-between text-[18px]">
            <span>People</span>
            <span className="text-[14px] text-hp-muted">✕ Clear 6</span>
          </div>
          <div className="flex flex-wrap gap-[8px]">
            <Chip label="Head of Growth" />
            <Chip label="VP Sales" selected />
            <Chip label="CRO" />
            <Chip label="RevOps Lead" />
            <Chip label="Demand Gen" />
          </div>
        </div>
        <div className="flex justify-between border-t border-hp-line-faint pt-[18px] text-[18px]">
          <span>Company size</span>
          <span className="text-hp-muted">50–500</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-[12px] hp-wide:gap-[16px]">
          <span className="rounded-[5px] bg-hp-ink px-[16px] py-[10px] text-[15px] text-hp-cream">
            Recruit 184 respondents
          </span>
          <span className="text-[14px] text-hp-muted">Incentive handled by Birdsong</span>
        </div>
      </>
    ),
  },
  {
    title: "Recruit And Interview",
    body: "Birdsong invites respondents, verifies role and company, and runs an in-depth conversation. Nothing is pitched.",
    gap: "20px",
    mock: (
      <>
        <div className="flex items-center gap-[12px]">
          <span className="h-[10px] w-[10px] rounded-full bg-hp-green" />
          <span className="text-[15px] text-hp-muted">Live interview · 14:02</span>
        </div>
        <div className="max-w-[85%] self-start rounded-[10px] bg-hp-bubble px-[16px] py-[14px] text-[16px] leading-[1.45]">
          How does inbound get triaged on your team today?
        </div>
        <div className="max-w-[85%] self-end rounded-[10px] bg-hp-green-tint px-[16px] py-[14px] text-[16px] leading-[1.45]">
          Everything sits for days and the good ones go cold. Two reps rotate on it.
        </div>
        <div className="max-w-[85%] self-start rounded-[10px] bg-hp-bubble px-[16px] py-[14px] text-[16px] leading-[1.45]">
          How many hours a month does that cost you?
        </div>
        <div className="max-w-[85%] self-end rounded-[10px] bg-hp-green-tint px-[16px] py-[14px] text-[16px] leading-[1.45]">
          Call it forty. My CRO asks about it every week.
        </div>
      </>
    ),
  },
  {
    title: "Score Against Your ICP",
    body: "Every interview is scored for pain, buyer and timeline. The quotes ship with the score so your team can disagree with it.",
    gap: "24px",
    mock: (
      <>
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[22px]">ICP fit</span>
          <span className="rounded-full bg-hp-green px-[14px] py-[6px] text-[15px] text-hp-cream">
            Score 9 / 10
          </span>
        </div>
        <div className="flex flex-col gap-[14px] text-[16px]">
          <ScoreRow label="Pain" value="40 hours a month lost to manual triage" />
          <ScoreRow label="Buyer" value="CRO, named in the conversation" />
          <ScoreRow label="Timeline" value="Evaluating this quarter" />
          <ScoreRow
            label="Evidence"
            value={<span className="text-hp-green">4 quotes attached ↗</span>}
            last
          />
        </div>
      </>
    ),
  },
  {
    title: "Hand Over The Hot Ones",
    body: "Qualified leads land in your queue with the transcript, the reasoning and a generated call opener.",
    gap: "24px",
    mock: (
      <>
        <div className="text-[15px] text-hp-muted">Your queue · 3 hot leads</div>
        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] rounded-[8px] border border-hp-green-line bg-hp-green-wash p-[16px]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-hp-green-pale text-[14px] font-semibold text-hp-green">
            SO
          </div>
          <div className="flex min-w-0 flex-1 basis-[120px] flex-col gap-[2px]">
            <span className="text-[17px]">Sam Okafor</span>
            <span className="text-[14px] text-hp-muted">Head of Growth · Coretide</span>
          </div>
          <span className="ml-auto shrink-0 text-[14px] text-hp-green">Demo booked</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] rounded-[8px] border border-hp-line-faint p-[16px]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-hp-note-yellow text-[14px] font-semibold">
            MK
          </div>
          <div className="flex min-w-0 flex-1 basis-[120px] flex-col gap-[2px]">
            <span className="text-[17px]">Maya Klein</span>
            <span className="text-[14px] text-hp-muted">VP Sales · Lumen Ops</span>
          </div>
          <span className="ml-auto shrink-0 text-[14px] text-hp-muted">Score 8 / 10</span>
        </div>
        <div className="rounded-[8px] bg-hp-bubble p-[16px] text-[15px] leading-[1.5]">
          <span className="text-hp-green">Call opener:</span> “You said triage eats your team’s best
          hours. Walk me through the worst morning.”
        </div>
      </>
    ),
  },
] as const;

export function ProductSection() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = stepRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (!els.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.step));
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="product"
      className="mx-auto max-w-[1280px] scroll-mt-[96px] px-[24px] pb-[80px] pt-[24px] hp-wide:pb-[120px] hp-wide:pt-[40px]"
    >
      <div className="mb-[40px] flex max-w-[820px] flex-col gap-[20px] hp-wide:mb-[64px] hp-wide:gap-[28px]">
        <div className="text-[20px] text-hp-muted hp-wide:text-[22px]">The Product</div>
        <h2 className="m-0 text-balance font-hp-serif text-[clamp(36px,8vw,72px)] font-normal leading-[1.02] tracking-[-0.02em] hp-wide:text-[clamp(40px,5.2vw,72px)]">
          Deeper Than A Form Fill. Faster Than A Research Firm.
        </h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-[40px] hp-wide:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] hp-wide:gap-[72px]">
        {/* The pinned panel is ≥900px only — see the note at the top of the file. */}
        <div className="relative hidden h-[var(--hp-panel)] overflow-hidden rounded-[12px] bg-hp-green-pale shadow-[0_1px_0_rgba(27,31,28,0.06)] hp-wide:sticky hp-wide:top-[96px] hp-wide:block">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              aria-hidden={i !== active}
              className="pointer-events-none absolute inset-0 pl-[32px] pt-[32px] transition-opacity [transition-duration:450ms]"
              style={{ opacity: i === active ? 1 : 0 }}
            >
              <MockCard gap={step.gap}>{step.mock}</MockCard>
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              data-step={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="hp-step flex flex-col justify-center gap-[20px] py-[28px] transition-opacity [transition-duration:400ms] hp-wide:min-h-[var(--hp-panel)] hp-wide:py-[40px]"
              style={{ opacity: i === active ? 1 : 0.35 }}
            >
              <div className="flex items-center">
                <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full border-[1.5px] border-hp-ink bg-hp-green-pale font-hp-serif text-[22px] leading-none text-hp-ink shadow-hp-badge">
                  {i + 1}
                </span>
              </div>
              <h3 className="m-0 font-hp-serif text-[clamp(30px,2.8vw,42px)] font-normal leading-[1.05] tracking-[-0.02em]">
                {step.title}
              </h3>
              <p className="m-0 max-w-[380px] text-pretty text-[clamp(17px,1.3vw,20px)] leading-[1.45] text-hp-body">
                {step.body}
              </p>

              {/* Phone: this step's own mock, in flow, instead of the pinned panel. */}
              <div className="mt-[8px] overflow-hidden rounded-[12px] bg-hp-green-pale pl-[16px] pt-[16px] hp-wide:hidden">
                <MockCard gap={step.gap}>{step.mock}</MockCard>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
