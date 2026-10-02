import Image from "next/image";
import { HeroFlock } from "./Flock";
import { bslGlass, bslSolid } from "./buttons";

/**
 * Hero: the top of the shared sky, with the headline held down in the
 * bottom-left and a feature panel beside it.
 *
 * Three layers over the band SkyBand paints, bottom to top:
 *   1. the sun — one off-centre radial glow burning through the top right. It
 *      is the only element in the load intro that moves before the copy does.
 *   2. the flock (see Flock.tsx — its coordinates keep it clear of the copy).
 *   3. a readability scrim: dark at the very top, clear through the 14-34%
 *      band where the birds are, heaviest at 60%, then easing back out. It is
 *      what lets cream text sit on the pale middle of the sky without a
 *      text-shadow.
 *   4. the content grid.
 *
 * The scrim hangs 420px *below* the hero's own box, and the section is
 * overflow-visible so it can. That is deliberate: the copy's lower half needs
 * the darkening, but the hero's bottom edge is in the middle of a continuous
 * sky now, so a scrim that stopped there would draw a horizontal seam exactly
 * where v4 removed one. Running it past the boundary and fading to zero in
 * open air is what hides the join.
 *
 * min-height is max(88vh, 680px), down from v4's full viewport: with the band
 * continuing into the next section there is no longer any reason for the hero
 * to fill the screen on its own, and 88vh puts the top of the conversation
 * section's headline just into view as a reason to keep scrolling.
 *
 * The grid is bottom-aligned, so the panel and the headline share a baseline
 * no matter how tall either gets, with the pair centred together in whatever
 * vertical slack the min-height leaves. Under 900px there is no room for a
 * 360px column beside a clamp(56px,8vw,124px) headline, so the panel drops
 * below the copy rather than squeezing it.
 *
 * The 240px top padding under 900px is not breathing room, it is the sky band
 * the narrow flock flies in — nav, then birds, then the copy. At the desktop
 * value the birds and the eyebrow occupy the same strip, and there is nowhere
 * on a phone-width hero for them to go that is not on top of something.
 */

/* The three panel rows. v4 collapsed what had been three separately-frosted
   cards into one pane of hairline-divided rows, and v5 rewrote the copy from
   product-feature naming ("AI-moderated", "In their words", "Straight to
   CRM") to the plain claims below. The last row carries the integration
   chips. */
const ROWS = [
  {
    title: "Real interviews",
    body: "An AI moderator talks to every participant and asks follow-ups.",
  },
  {
    title: "Know who's ready to buy",
    body: "Every interview is scored on pain, timing, and authority, so reps only call the warm ones.",
  },
  {
    title: "Works with your stack",
    body: "Good-fit leads sync with the full conversation.",
    chips: [
      { name: "HubSpot", src: "/assets/hubspot.png" },
      { name: "Slack", src: "/assets/slack.webp" },
      { name: "Apollo", src: "/assets/apollo.png" },
      { name: "Instantly", src: "/assets/instantly.png" },
      { name: "Claude", src: "/assets/claude.webp" },
    ],
  },
];

/** The load intro's per-element timing, as the custom properties .bsl-rise
    reads (see app/globals.css). The cast is the only way to put a custom
    property in a React style object, and doing it once here keeps it out of
    the four call sites below. */
const rise = (dur: string, delay: string) =>
  ({ "--bsl-dur": dur, "--bsl-delay": delay }) as React.CSSProperties;

export function SkyHero({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <section id="top" className="relative flex min-h-[max(88vh,680px)] bg-transparent">
      <div
        aria-hidden
        className="bsl-sun pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 60% at 72% 8%, rgba(255,236,196,.95) 0%, rgba(247,214,160,.55) 22%, rgba(247,214,160,0) 60%)",
        }}
      />

      <HeroFlock />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 bottom-[-420px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(16,22,18,.26) 0%, rgba(16,22,18,0) 14%, rgba(16,22,18,0) 34%, rgba(16,22,18,.34) 60%, rgba(16,22,18,.22) 74%, rgba(16,22,18,.08) 88%, rgba(16,22,18,0) 100%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-[1480px] grid-cols-1 content-center items-end gap-[48px] px-[24px] pb-[56px] pt-[240px] bsl-wide:grid-cols-[minmax(0,1fr)_360px] bsl-wide:px-[48px] bsl-wide:pt-[180px]">
        <div className="max-w-[880px]">
          <div
            className="bsl-rise mb-[22px] text-[15px] uppercase tracking-[0.08em] text-bsl-cream"
            style={rise("0.9s", "0.9s")}
          >
            Interview-led pipeline for B2B revenue teams
          </div>
          <h1
            className="bsl-rise m-0 text-balance font-bsl-serif text-[clamp(56px,8vw,124px)] font-normal leading-[0.94] tracking-[-0.025em] text-bsl-cream"
            style={rise("1.1s", "1.05s")}
          >
            Turn your audience into pipeline.
          </h1>
          <p
            className="bsl-rise m-0 mt-[28px] max-w-[620px] text-pretty text-[21px] leading-[1.45] text-bsl-cream-soft"
            style={rise("0.9s", "1.3s")}
          >
            Birdsong agents find the right people, talk to them, and route qualified opportunities
            straight to your sales team.
          </p>
          <div
            className="bsl-rise mt-[36px] flex flex-wrap gap-[12px]"
            style={rise("0.9s", "1.45s")}
          >
            <a href={bookDemoUrl} className={`${bslSolid} px-[26px] py-[16px] text-[17px]`}>
              Book a demo{" "}
              <span aria-hidden className="font-bsl-glyph">
                →
              </span>
            </a>
            <a href="#how" className={`${bslGlass} px-[26px] py-[16px] text-[17px]`}>
              See how it works
            </a>
          </div>
        </div>

        {/* One pane at 90% cream, not three cards on a frosted tray. The rows
            are separated by a hairline on all but the first, so the dividers
            sit between rows without a border running along the pane's own top
            edge. The 6px/24px padding is asymmetric on purpose: the rows carry
            their own 18px vertical padding, so the pane only needs enough to
            keep the first and last off its rounded corners. */}
        <div
          className="bsl-rise flex flex-col rounded-[18px] bg-bsl-cream/90 px-[24px] py-[6px] backdrop-blur-[12px]"
          style={rise("1s", "1.7s")}
        >
          {ROWS.map((row, i) => (
            <div
              key={row.title}
              className={`flex flex-col gap-[6px] py-[18px] ${
                i > 0 ? "border-t border-bsl-line-soft" : ""
              }`}
            >
              <div className="font-bsl-serif text-[26px] leading-[1.1] text-bsl-ink">
                {row.title}
              </div>
              <div className="text-pretty text-[15px] leading-[1.45] text-bsl-body">{row.body}</div>
              {/* Rendered on every row, not just the one with chips. Empty it
                  contributes its 6px gap and 4px offset and nothing else,
                  which is what keeps the three rows on one vertical rhythm —
                  without it the two chipless rows close up 10px tighter and
                  the whole pane sits 20px short against the headline it is
                  baseline-aligned with. */}
              <div className="mt-[4px] flex flex-wrap gap-[6px]">
                {(row.chips ?? []).map((chip) => (
                  <span
                    key={chip.name}
                    className="inline-flex items-center gap-[7px] rounded-full border border-bsl-line bg-bsl-card py-[5px] pl-[7px] pr-[12px] text-[13px] text-bsl-ink"
                  >
                    {/* contain, not cover: these are five vendor marks with
                          five different aspect ratios and their own padding,
                          and cover would crop the wider ones. */}
                    <Image
                      src={chip.src}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] flex-none rounded-[4px] object-contain"
                    />
                    {chip.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
