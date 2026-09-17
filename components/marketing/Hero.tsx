import Link from "next/link";
import { cn } from "@/lib/utils";
import { Starburst } from "./Starburst";

export type HeroDemo = {
  // Mac-dots header: who this interview is with, and how far in.
  headerLabel: string;
  headerMinute?: string;
  question: { pre: string; bold: string; post: string };
  answer: string;
  followUp: string;
  signals: [string, string, string];
};

// Hero for both landing pages. The demand-gen page (app/page.tsx) runs the
// v2 treatment from design_handoff_landing_v2: a rotated status sticker, a
// Bricolage headline whose last word sits in a green marker block, hard
// offset shadows on the buttons and the interview card, and a fact marquee
// under the CTAs. The customer-success page still passes `eyebrow` and
// `trustPoints` and gets the earlier underline accent, since v2 shipped no
// spec for it — hence both accents live here rather than one replacing the
// other.
//
// The interview artifact on the right runs a 12s loop: question, answer,
// follow-up, then the three signal chips landing one at a time.
export function Hero({
  eyebrow,
  statusSticker,
  headlinePre,
  headlineAccent,
  accentStyle = "underline",
  subhead,
  accentUnderlineWidth = 260,
  trustPoints = [],
  marquee = [],
  demo,
}: {
  eyebrow?: string;
  // v2's replacement for the eyebrow: green pill, blinking dot, rotated off
  // axis. Takes precedence when both are given.
  statusSticker?: string;
  headlinePre: string;
  headlineAccent: string;
  accentStyle?: "marker" | "underline";
  subhead: string;
  // viewBox width of the squiggle under the accent phrase, in the same
  // units the reference uses per page (260 demand gen, 300 CS) — it also
  // sets the draw-on dash length, see .lp-ul-draw in globals.css.
  accentUnderlineWidth?: number;
  trustPoints?: string[];
  // Facts scrolled through the bordered strip under the CTAs. Rendered
  // twice, the second copy aria-hidden, so the loop has no visible seam.
  marquee?: string[];
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

      {/* The 240px subtrahend is the chrome this grid shares the viewport
          with, measured rather than estimated: 82px of nav (16px pt-4 plus a
          66px pill), this section's 56px pt-14, and its 84px pb. At 200px the
          grid asked for more height than was left, so on a tall window the
          hero overran the fold by ~38px.

          This floor only governs on tall windows. Below roughly 870px the
          left column (630px) is taller and sets the row height instead, which
          is why this value is not what fixes the clipped sticker: see the
          self-start note on the card column. Anything added above or below
          this grid has to be added here too. */}
      <div className="relative mx-auto grid min-h-[calc(100vh-240px)] max-w-[1480px] grid-cols-[1.02fr_1fr] items-center gap-[76px] lp-stack:min-h-0 lp-stack:grid-cols-1 lp-stack:gap-14">
        <div>
          {statusSticker ? (
            <div data-reveal className="mb-[26px]">
              <span className="inline-flex rotate-[-2deg] items-center gap-[9px] rounded-full border-2 border-landing-ink bg-landing-green px-4 pb-2 pt-[7px] text-[13px] font-bold tracking-[-0.005em] text-white shadow-[3px_3px_0_var(--lp-ink)]">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-white motion-safe:animate-[lp-dot-blink_2s_ease_infinite]"
                />
                {statusSticker}
              </span>
            </div>
          ) : (
            eyebrow && (
              <div
                data-reveal
                className="mb-7 flex items-center gap-3 text-[12.5px] font-semibold tracking-[0.14em] text-landing-muted"
              >
                <span className="h-px w-[34px] shrink-0 bg-landing-faint" />
                {eyebrow}
              </div>
            )
          )}

          {accentStyle === "marker" ? (
            <h1
              data-reveal
              className="m-0 max-w-[13ch] text-balance font-bricolage text-[clamp(50px,5.7vw,88px)] font-bold leading-[0.97] tracking-[-0.035em] text-landing-ink"
            >
              {headlinePre}{" "}
              {/* z-0, not the default auto: the marker block is a z-index:-1
                  child, and without a stacking context of its own here it
                  would paint behind the section background instead of behind
                  just this word. The trailing period belongs inside the span
                  so the block covers it too. */}
              <span className="relative z-0 inline-block text-white">
                {headlineAccent}
                <span aria-hidden="true" className="lp-hl" />
              </span>
            </h1>
          ) : (
            <h1
              data-reveal
              className="m-0 max-w-[15ch] text-balance font-bricolage text-[clamp(46px,5vw,78px)] font-bold leading-[1.02] tracking-[-0.03em] text-landing-ink"
            >
              {headlinePre}{" "}
              {/* Italic here is the display face slanted, not Spectral:
                  Spectral is now reserved for respondent pull quotes, and
                  the reference sets its own italic heading accents the same
                  way. */}
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
          )}

          <p
            data-reveal
            style={{ transitionDelay: "0.1s" }}
            className="m-0 mt-7 max-w-[42ch] text-pretty text-[20px] leading-[1.55] text-landing-ink-soft"
          >
            {subhead}
          </p>
          <div
            data-reveal
            style={{ transitionDelay: "0.18s" }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/admin/signup"
              className="lp-hard-cta lp-hard-cta-green rounded-full border-2 border-landing-ink bg-landing-ink px-8 py-[15px] text-[16px] font-bold text-landing-bg shadow-[5px_5px_0_var(--lp-green)]"
            >
              Get started
            </Link>
            <Link
              href="#how"
              className="lp-hard-cta rounded-full border-2 border-landing-ink bg-landing-surface px-[30px] py-[15px] text-[16px] font-bold text-landing-ink shadow-[5px_5px_0_var(--lp-ink)]"
            >
              See how it works
            </Link>
          </div>

          {marquee.length > 0 && (
            <div
              data-reveal
              style={{ transitionDelay: "0.26s" }}
              // With motion off the track stops mid-strip, which would leave
              // the last fact clipped behind the pill's edge with no way to
              // reach it. Scrolling the pill by hand replaces the animation
              // there, and the duplicate copy (only needed for a seamless
              // loop) is dropped so it isn't scrolled through twice.
              className="lp-tickwrap mt-12 max-w-[560px] overflow-hidden rounded-full border-2 border-landing-ink bg-landing-surface motion-reduce:overflow-x-auto"
            >
              <div className="lp-tick flex gap-[26px] whitespace-nowrap py-[11px] text-[13.5px] font-semibold text-landing-ink-soft">
                <MarqueeRun facts={marquee} className="pl-[26px] pr-[26px]" />
                <MarqueeRun facts={marquee} aria-hidden="true" className="motion-reduce:hidden" />
              </div>
            </div>
          )}

          {/* The demand-gen page runs the marquee instead of this row, so it
              renders nothing at all there rather than the bare hairline an
              empty bordered div would leave under the buttons. */}
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

        {/* self-start, not the grid's default centring. The left column is the
            taller of the two (630px against the card's 434px), so it sets the
            row height and the card gets centred inside the leftover 196px,
            which pushed it ~97px down the page. The "chirp!" sticker hangs
            26px below the card, so that offset put its bottom at 689px from
            the top of the document no matter how short the window was, and it
            was cut off on any viewport under ~690px. Aligning the card to the
            top of the row lifts the sticker to 591px. Below lp-stack the grid
            is a single column, where this has no effect. */}
        <div data-reveal style={{ transitionDelay: "0.22s" }} className="relative self-start">
          <div className="motion-safe:animate-[lp-floaty_8s_ease-in-out_infinite]">
            <Starburst
              label="chirp!"
              size={92}
              rotationDeg={-8}
              hard
              fillClassName="fill-landing-green-bg"
              labelClassName="font-bricolage text-[17px] font-bold not-italic"
              className="absolute -bottom-[26px] -left-[42px] z-[2]"
            />
            <div className="overflow-hidden rounded-[20px] border-2 border-landing-ink bg-landing-surface shadow-[10px_10px_0_var(--lp-ink)]">
              <div className="flex items-center gap-2.5 border-b-2 border-landing-ink bg-landing-green px-5 py-3.5">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-white opacity-85" />
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-white opacity-85" />
                <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-white opacity-85" />
                <span className="ml-2 truncate text-[13px] font-bold text-white">
                  {demo.headerLabel}
                </span>
                {demo.headerMinute && (
                  <span className="ml-auto shrink-0 text-[12.5px] font-semibold text-white/80">
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
                <div className="max-w-[86%] self-start rounded-[16px_16px_16px_4px] border-[1.5px] border-landing-ink bg-landing-surface px-[19px] py-3.5 text-[15.5px] leading-[1.55] motion-safe:animate-[lp-hero-q1_12s_ease_infinite]">
                  {demo.question.pre} <b className="font-bold">{demo.question.bold}</b>
                  {demo.question.post}
                </div>
                <div className="max-w-[82%] self-end rounded-[16px_16px_4px_16px] border-[1.5px] border-landing-ink bg-landing-green px-[19px] py-3.5 text-[15.5px] leading-[1.55] text-[#f3f6f0] motion-safe:animate-[lp-hero-a1_12s_ease_infinite]">
                  {demo.answer}
                </div>
                <div className="max-w-[80%] self-start rounded-[16px_16px_16px_4px] border-[1.5px] border-landing-ink bg-landing-surface px-[19px] py-3.5 text-[15.5px] leading-[1.55] motion-safe:animate-[lp-hero-q2_12s_ease_infinite]">
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
              <div className="flex min-h-[34px] flex-wrap items-center gap-2.5 border-t-2 border-landing-ink bg-landing-surface py-4 pl-[62px] pr-5 lp-mobile:pl-5">
                <span className="mr-0.5 text-[11.5px] font-bold tracking-[0.1em] text-landing-muted">
                  SIGNALS
                </span>
                <span className="rounded-full bg-landing-green px-[13px] py-1.5 text-[12.5px] font-semibold text-[#f3f6f0] motion-safe:animate-[lp-signal-1_12s_ease_infinite]">
                  {demo.signals[0]}
                </span>
                <span className="rounded-full border-[1.5px] border-landing-green bg-landing-green-bg px-3 py-[5px] text-[12.5px] font-semibold text-landing-green motion-safe:animate-[lp-signal-2_12s_ease_infinite]">
                  {demo.signals[1]}
                </span>
                <span className="rounded-full bg-landing-blue-bg px-[13px] py-1.5 text-[12.5px] font-semibold text-landing-blue motion-safe:animate-[lp-signal-3_12s_ease_infinite]">
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

// One pass of the marquee's contents. Two of these sit side by side inside
// the .lp-tick track, which translates exactly -50% — so the pair has to be
// identical, including the asterisk after the last fact.
function MarqueeRun({
  facts,
  className,
  ...rest
}: {
  facts: string[];
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("flex gap-[26px]", className)} {...rest}>
      {facts.map((fact) => (
        <span key={fact} className="contents">
          <span>{fact}</span>
          <span aria-hidden="true" className="text-landing-green">
            ✳
          </span>
        </span>
      ))}
    </span>
  );
}
