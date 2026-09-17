"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Product: a pinned pale-green panel holding four stacked white mocks,
 * paired with four steps that scroll past it.
 *
 * The only interactive thing on `/`, which is why this is the one client
 * component. An IntersectionObserver with a -45%/-45% rootMargin means a step
 * becomes active once it reaches the middle band of the viewport; `active`
 * then drives both the step opacity and which mock is visible. Under 900px
 * the panel stops being sticky, so the pairing no longer reads and globals.css
 * forces every step back to full opacity.
 */
const STEPS = [
  {
    title: "Define Your Audience",
    body: "Start with who you want to hear from. Role, company size, market. Sharp and specific. You own the brief.",
  },
  {
    title: "Recruit And Interview",
    body: "Birdsong invites respondents, verifies role and company, and runs an in-depth conversation. Nothing is pitched.",
  },
  {
    title: "Score Against Your ICP",
    body: "Every interview is scored for pain, buyer and timeline. The quotes ship with the score so your team can disagree with it.",
  },
  {
    title: "Hand Over The Hot Ones",
    body: "Qualified leads land in your queue with the transcript, the reasoning and a generated call opener.",
  },
] as const;

function Mock({
  active,
  gap,
  children,
}: {
  active: boolean;
  gap: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      className="pointer-events-none absolute inset-0 pl-[32px] pt-[32px] transition-opacity [transition-duration:450ms]"
      style={{ opacity: active ? 1 : 0 }}
    >
      <div
        className="flex h-full flex-col justify-start rounded-tl-[10px] bg-white px-[48px] py-[44px] shadow-hp-mock"
        style={{ gap }}
      >
        {children}
      </div>
    </div>
  );
}

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
      className={`grid grid-cols-[120px_minmax(0,1fr)] gap-[12px] ${
        last ? "" : "border-b border-hp-line-faint pb-[14px]"
      }`}
    >
      <span className="text-hp-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

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
    <section id="product" className="mx-auto max-w-[1280px] scroll-mt-[96px] px-[24px] pb-[120px] pt-[40px]">
      <div className="mb-[64px] flex max-w-[820px] flex-col gap-[28px]">
        <div className="text-[22px] text-hp-muted">The Product</div>
        <h2 className="m-0 text-balance font-hp-serif text-[clamp(40px,5.2vw,72px)] font-normal leading-[1.02] tracking-[-0.02em]">
          Deeper Than A Form Fill. Faster Than A Research Firm.
        </h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-[72px] hp-wide:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="relative h-[var(--hp-panel)] overflow-hidden rounded-[12px] bg-hp-green-pale shadow-[0_1px_0_rgba(27,31,28,0.06)] hp-wide:sticky hp-wide:top-[96px]">
          <Mock active={active === 0} gap="22px">
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
            <div className="mt-auto flex items-center gap-[16px]">
              <span className="rounded-[5px] bg-hp-ink px-[16px] py-[10px] text-[15px] text-hp-cream">
                Recruit 184 respondents
              </span>
              <span className="text-[14px] text-hp-muted">Incentive handled by Birdsong</span>
            </div>
          </Mock>

          <Mock active={active === 1} gap="20px">
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
          </Mock>

          <Mock active={active === 2} gap="24px">
            <div className="flex items-center justify-between">
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
          </Mock>

          <Mock active={active === 3} gap="24px">
            <div className="text-[15px] text-hp-muted">Your queue · 3 hot leads</div>
            <div className="flex items-center gap-[14px] rounded-[8px] border border-hp-green-line bg-hp-green-wash p-[16px]">
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-hp-green-pale text-[14px] font-semibold text-hp-green">
                SO
              </div>
              <div className="flex flex-1 flex-col gap-[2px]">
                <span className="text-[17px]">Sam Okafor</span>
                <span className="text-[14px] text-hp-muted">Head of Growth · Coretide</span>
              </div>
              <span className="text-[14px] text-hp-green">Demo booked</span>
            </div>
            <div className="flex items-center gap-[14px] rounded-[8px] border border-hp-line-faint p-[16px]">
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-hp-note-yellow text-[14px] font-semibold">
                MK
              </div>
              <div className="flex flex-1 flex-col gap-[2px]">
                <span className="text-[17px]">Maya Klein</span>
                <span className="text-[14px] text-hp-muted">VP Sales · Lumen Ops</span>
              </div>
              <span className="text-[14px] text-hp-muted">Score 8 / 10</span>
            </div>
            <div className="rounded-[8px] bg-hp-bubble p-[16px] text-[15px] leading-[1.5]">
              <span className="text-hp-green">Call opener:</span> “You said triage eats your team’s
              best hours. Walk me through the worst morning.”
            </div>
          </Mock>
        </div>

        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              data-step={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="hp-step flex min-h-[420px] flex-col justify-center gap-[20px] py-[40px] transition-opacity [transition-duration:400ms] hp-wide:min-h-[var(--hp-panel)]"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
