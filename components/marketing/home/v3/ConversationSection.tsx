"use client";

import { useEffect, useState } from "react";
import { InterviewDemo } from "./InterviewDemo";
import { ROUTED_STEP, STAGES, STEP_COUNT, STEP_MS, stageOf } from "./demoContent";

/**
 * "Pipeline starts with a real conversation" — the section that owns the
 * demo's clock.
 *
 * One piece of state, `step`, drives both halves: which stage row is lit and
 * how far its progress bar has filled, and everything inside the demo well.
 * They cannot disagree, because there is nothing for them to disagree about.
 *
 * `epoch` exists only to restart the interval. Clicking a stage has to both
 * jump the step *and* give that stage a fresh 1600ms before the next tick —
 * otherwise a click landing 1500ms into a tick would show the new stage for
 * 100ms. Bumping `epoch` re-runs the effect, which tears down the old
 * interval and starts a new one.
 *
 * Reduced motion: no interval at all, and `step` is pinned to the routed
 * end-state, which is the one frame that shows the whole story (transcript
 * complete, all four signals, score 92, assigned to a rep). Clicking a stage
 * still works — that is a deliberate user action, not ambient motion — it
 * just does not start playing.
 *
 * The media query is read in an effect rather than at render because the
 * server has no way to know it; a reduced-motion visitor sees step 0 for one
 * frame before it settles on 9.
 */

const LEAD =
  "Birdsong runs AI-moderated research studies with your market. People share what they're struggling with, in their own words. The ones ready to buy go straight to your reps, with the full transcript attached.";

export function ConversationSection() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setStep(ROUTED_STEP);
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEP_COUNT), STEP_MS);
    return () => clearInterval(id);
  }, [reduced, epoch]);

  const current = stageOf(step);

  return (
    <section
      id="how"
      className="relative bg-transparent px-[24px] pb-[112px] pt-[72px] bsl-wide:px-[48px]"
    >
      {/* A cream haze behind the header, not a band with edges. The section is
          transparent on the shared sky, and this is what buys the headline
          enough contrast to be ink rather than cream without putting a lid on
          the gradient. It starts 80px above the section so the fade-in begins
          while still over the hero, and at 380px tall it has run out well
          before the demo well — which wants the blue behind it. Peaks at 55%:
          past about 60% the top edge of the haze starts to read as a line. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-80px] h-[380px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(246,243,236,0) 0%, rgba(246,243,236,.42) 30%, rgba(246,243,236,.55) 55%, rgba(246,243,236,.42) 78%, rgba(246,243,236,0) 100%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1480px] flex-col gap-[64px]">
        {/* Header. auto-fit with a min of min(100%, 480px) so the two columns
            sit side by side above ~1070px and collapse to one below it,
            without a breakpoint to maintain. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] items-end gap-x-[72px] gap-y-[40px]">
          <div>
            <h2 className="m-0 text-balance font-bsl-serif text-[clamp(52px,6.2vw,104px)] font-normal leading-[0.95] tracking-[-0.025em] text-bsl-ink">
              Pipeline starts with a <em className="italic text-bsl-forest-ink">real</em>{" "}
              conversation.
            </h2>
          </div>
          <div className="flex max-w-[560px] flex-col gap-[20px]">
            {/* Full ink, not the softer --bsl-body the same paragraph used on
                cream. It is sitting on sky now, and --bsl-body did not hold up
                against the blue showing through the haze. */}
            <p className="m-0 text-pretty text-[21px] leading-[1.5] text-bsl-ink">{LEAD}</p>
          </div>
        </div>

        {/* wrap-reverse, so that when the two columns no longer fit side by
            side the demo well — the second child — lands on the upper line.
            It is the thing worth seeing first on a phone. */}
        <div className="flex flex-wrap-reverse items-stretch gap-x-[40px] gap-y-[24px]">
          <div className="flex min-w-0 flex-[1_1_340px] flex-col">
            {STAGES.map((stage, i) => (
              <button
                key={stage.tag}
                type="button"
                onClick={() => {
                  setStep(stage.start);
                  setEpoch((e) => e + 1);
                }}
                aria-current={i === current ? "step" : undefined}
                className={`flex cursor-pointer flex-col gap-[10px] px-[4px] pb-[20px] pt-[24px] text-left transition-opacity [transition-duration:400ms] ${
                  i === current ? "opacity-100" : "opacity-45"
                }`}
              >
                <span className="flex items-baseline justify-between gap-[16px]">
                  <span className="font-bsl-serif text-[34px] leading-[1.05] text-bsl-ink">
                    {stage.title}
                  </span>
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-bsl-forest">
                    {stage.tag}
                  </span>
                </span>
                <span className="max-w-[440px] text-[16px] leading-[1.5] text-bsl-body-soft">
                  {stage.body}
                </span>
                <span
                  aria-hidden
                  className="mt-[12px] block h-[2px] overflow-hidden rounded-[2px] bg-bsl-line"
                >
                  {/* Linear, not eased: the bar is a clock face, and an
                      ease would make the last steps of a stage look slower
                      than the first even though they are not. */}
                  <span
                    className="block h-full bg-bsl-forest transition-[width] [transition-duration:1400ms] [transition-timing-function:linear]"
                    style={{
                      width:
                        i < current
                          ? "100%"
                          : i === current
                            ? `${Math.round(((step - stage.start + 1) / stage.length) * 100)}%`
                            : "0%",
                    }}
                  />
                </span>
              </button>
            ))}
          </div>

          <div
            className="min-w-0 flex-[2_1_600px] rounded-[28px] border border-bsl-well-line bg-bsl-well p-[22px]"
            style={{
              backgroundImage: "radial-gradient(rgb(var(--bsl-well-dot)) 1.2px, transparent 1.2px)",
              backgroundSize: "18px 18px",
            }}
          >
            <InterviewDemo step={step} />
          </div>
        </div>
      </div>
    </section>
  );
}
