import Link from "next/link";
import { Starburst } from "./Starburst";

export type HeroDemo = {
  // Mac-dots header: who this interview is with, and how far in.
  headerLabel: string;
  headerMinute?: string;
  question: { pre: string; bold: string; post: string };
  answer: string;
  followUp: string;
  signals: [string, string, string];
  // The third chip reads as a score rather than a signal, so it takes the
  // blue tint instead of green.
  signalScoreTint?: boolean;
};

// Hero for both landing pages (design_handoff_landing_pages_full): an
// editorial two-column grid, a headline whose coloured phrase gets a
// squiggle drawn under it on reveal, and the live-interview artifact on the
// right running a 12s loop (question, answer, follow-up, then the three
// signal chips landing one at a time).
export function Hero({
  eyebrow,
  headlinePre,
  headlineAccent,
  subhead,
  accentUnderlineWidth = 260,
  trustPoints = [],
  demo,
}: {
  eyebrow: string;
  headlinePre: string;
  headlineAccent: string;
  subhead: string;
  // viewBox width of the squiggle under the accent phrase, in the same
  // units the reference uses per page (260 demand gen, 300 CS) — it also
  // sets the draw-on dash length, see .lp-ul-draw in globals.css.
  accentUnderlineWidth?: number;
  trustPoints?: string[];
  demo: HeroDemo;
}) {
  const underlineEnd = accentUnderlineWidth - 2;
  return (
    <section id="top" className="relative px-6 pb-[84px] pt-14 md:px-10">
      {/* Ambient layer: two blurred colour blobs and two drifting note
          glyphs, all decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[130px] left-[3%] h-[440px] w-[440px] rounded-full bg-landing-green-bg opacity-50 blur-[95px] motion-safe:animate-[lp-drift_16s_ease-in-out_infinite]" />
        <div className="absolute -top-[90px] right-[1%] h-[400px] w-[400px] rounded-full bg-landing-blue-bg opacity-50 blur-[95px] motion-safe:animate-[lp-drift_19s_ease-in-out_2s_infinite_reverse]" />
        <span className="absolute left-[11%] top-[150px] text-[18px] text-landing-green opacity-[0.32] motion-safe:animate-[lp-drift_11s_ease-in-out_infinite]">
          ♪
        </span>
        <span className="absolute right-[26%] top-24 text-[15px] text-landing-blue opacity-[0.32] motion-safe:animate-[lp-drift_13s_ease-in-out_1.2s_infinite]">
          ♫
        </span>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-200px)] max-w-[1480px] grid-cols-[1.02fr_1fr] items-center gap-[76px] lp-stack:min-h-0 lp-stack:grid-cols-1 lp-stack:gap-14">
        <div>
          <div
            data-reveal
            className="mb-7 flex items-center gap-3 text-[12.5px] font-semibold tracking-[0.14em] text-landing-muted"
          >
            <span className="h-px w-[34px] shrink-0 bg-landing-faint" />
            {eyebrow}
          </div>
          <h1
            data-reveal
            className="m-0 max-w-[15ch] text-balance font-spectral text-[clamp(46px,5vw,78px)] font-medium leading-[1.02] tracking-[-0.021em] text-landing-ink"
          >
            {headlinePre}{" "}
            <span className="relative inline-block font-normal italic text-landing-green">
              {headlineAccent}
              <svg
                width="100%"
                height="10"
                viewBox={`0 0 ${accentUnderlineWidth} 10`}
                preserveAspectRatio="none"
                fill="none"
                aria-hidden="true"
                className="absolute -bottom-1.5 left-0 overflow-visible"
              >
                <path
                  className="lp-ul-draw"
                  style={{ "--lp-ul-len": underlineEnd - 2 } as React.CSSProperties}
                  d={`M2 5 H ${underlineEnd}`}
                  stroke="var(--lp-green)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity=".55"
                />
              </svg>
            </span>
          </h1>
          <p
            data-reveal
            style={{ transitionDelay: "0.1s" }}
            className="m-0 mt-[30px] max-w-[46ch] text-pretty text-[19.5px] leading-[1.62] text-landing-muted"
          >
            {subhead}
          </p>
          <div
            data-reveal
            style={{ transitionDelay: "0.18s" }}
            className="mt-9 flex flex-wrap items-center gap-3.5"
          >
            <Link
              href="/admin/signup"
              className="lp-cta rounded-full bg-landing-ink px-[30px] py-[15px] text-[15.5px] font-semibold text-landing-bg"
            >
              Get started
            </Link>
            <Link
              href="#how"
              className="lp-cta rounded-full border border-landing-ink bg-transparent px-[30px] py-[15px] text-[15.5px] font-semibold"
            >
              See how it works
            </Link>
          </div>
          {/* The demand-gen reference leaves this row's contents empty, so
              it renders nothing at all there rather than the bare hairline
              an empty bordered div would leave under the buttons. */}
          {trustPoints.length > 0 && (
            <div
              data-reveal
              style={{ transitionDelay: "0.26s" }}
              className="mt-11 flex flex-wrap gap-x-8 gap-y-3 border-t border-landing-hair pt-[26px] text-[14px] text-landing-faint"
            >
              {trustPoints.map((point) => (
                <span key={point}>{point}</span>
              ))}
            </div>
          )}
        </div>

        <div data-reveal style={{ transitionDelay: "0.22s" }} className="relative">
          <div className="motion-safe:animate-[lp-floaty_8s_ease-in-out_infinite]">
            <Starburst
              label="chirp!"
              size={92}
              rotationDeg={-8}
              fillClassName="fill-landing-green-bg"
              labelClassName="text-[16px]"
              className="absolute -bottom-[26px] -left-[42px] z-[2]"
            />
            <div className="overflow-hidden rounded-2xl border border-landing-border bg-landing-surface shadow-[0_30px_74px_rgba(34,30,24,0.1)]">
              <div className="flex items-center gap-2.5 border-b border-landing-hair px-5 py-3.5">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-landing-border" />
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-landing-border" />
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-landing-border" />
                <span className="ml-2 truncate text-[13px] font-medium text-landing-muted">
                  {demo.headerLabel}
                </span>
                {demo.headerMinute && (
                  <span className="ml-auto shrink-0 text-[12.5px] font-medium text-landing-faint">
                    {demo.headerMinute}
                  </span>
                )}
              </div>

              {/* Every bubble carries its settled, visible styling as the
                  base state, so with the loop off (reduced motion) the card
                  reads as a finished transcript rather than a blank panel. */}
              <div className="relative flex min-h-[296px] flex-col gap-[13px] bg-landing-sunk px-8 pb-[26px] pt-[30px]">
                <span
                  aria-hidden="true"
                  className="absolute right-24 top-3.5 text-[16px] text-landing-green opacity-0 motion-safe:animate-[lp-hero-note_12s_ease_infinite]"
                >
                  ♪
                </span>
                <div className="max-w-[86%] self-start rounded-[14px_14px_14px_4px] border border-landing-border bg-landing-surface px-[19px] py-3.5 text-[15.5px] leading-[1.55] shadow-[0_2px_8px_rgba(34,30,24,0.04)] motion-safe:animate-[lp-hero-q1_12s_ease_infinite]">
                  {demo.question.pre} <b className="font-semibold">{demo.question.bold}</b>
                  {demo.question.post}
                </div>
                <div className="max-w-[82%] self-end rounded-[14px_14px_4px_14px] bg-landing-green px-[19px] py-3.5 text-[15.5px] leading-[1.55] text-[#f3f6f0] motion-safe:animate-[lp-hero-a1_12s_ease_infinite]">
                  {demo.answer}
                </div>
                <div className="max-w-[80%] self-start rounded-[14px_14px_14px_4px] border border-landing-border bg-landing-surface px-[19px] py-3.5 text-[15.5px] leading-[1.55] shadow-[0_2px_8px_rgba(34,30,24,0.04)] motion-safe:animate-[lp-hero-q2_12s_ease_infinite]">
                  {demo.followUp}
                </div>
              </div>

              {/* Left padding clears the "chirp!" sticker instead of the
                  handoff's flat 20px: the sticker is anchored at -42px and is
                  92px wide, so it reaches 50px into the card and sits at this
                  row's vertical centre — at 20px the SIGNALS label rendered
                  as "IGNALS" underneath it. Indenting the row rather than
                  moving the sticker keeps the sticker on the reference's
                  coordinates, and it drops back to the normal 20px below
                  lp-mobile, where Starburst hides itself. */}
              <div className="flex min-h-[34px] flex-wrap items-center gap-2.5 border-t border-landing-hair bg-landing-surface py-4 pl-[62px] pr-5 lp-mobile:pl-5">
                <span className="mr-0.5 text-[11.5px] font-semibold tracking-[0.1em] text-landing-faint">
                  SIGNALS
                </span>
                <span className="rounded-full bg-landing-green-bg px-[13px] py-1.5 text-[12.5px] font-medium text-landing-green-deep motion-safe:animate-[lp-signal-1_12s_ease_infinite]">
                  {demo.signals[0]}
                </span>
                <span className="rounded-full bg-landing-green-bg px-[13px] py-1.5 text-[12.5px] font-medium text-landing-green-deep motion-safe:animate-[lp-signal-2_12s_ease_infinite]">
                  {demo.signals[1]}
                </span>
                <span className="rounded-full bg-landing-blue-bg px-[13px] py-1.5 text-[12.5px] font-medium text-landing-blue motion-safe:animate-[lp-signal-3_12s_ease_infinite]">
                  {demo.signals[2]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
