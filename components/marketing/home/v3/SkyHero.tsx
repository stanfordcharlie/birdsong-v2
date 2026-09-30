import { HeroFlock } from "./Flock";
import { bslGlass, bslSolid } from "./buttons";

/**
 * Hero: a full-viewport sky with a flock drifting across the right half and
 * the headline held down in the bottom-left corner.
 *
 * Four stacked layers, bottom to top:
 *   1. the sky itself — a vertical gradient from --bsl-sky down to the sand
 *      --bsl-horizon, with an off-centre sun glow burning through the top
 *      right. No photograph; the whole thing is two gradients.
 *   2. the flock (see Flock.tsx — its coordinates keep it clear of the copy).
 *   3. a readability scrim, dark at the very top and heavier at the bottom,
 *      transparent through the middle 22-50% band. It is what lets cream text
 *      sit on the pale horizon without a text-shadow, and it deliberately
 *      does *not* dim the middle of the sky where the birds are.
 *   4. the content grid.
 *
 * min-height is max(100vh, 760px), not 100vh: below about 760px of viewport
 * the two-column grid's own content is taller than the screen anyway, and
 * pinning to 100vh there just produced a scrollbar inside a "full height"
 * section.
 *
 * The grid is bottom-aligned, so the feature cards and the headline share a
 * baseline no matter how tall either gets. Under 900px there is no room for
 * a 300px column beside a clamp(56px,8vw,124px) headline, so the cards drop
 * below the copy rather than squeezing it.
 *
 * The 240px top padding under 900px is not breathing room, it is the sky band
 * the narrow flock flies in — nav, then birds, then the copy. At 140px (the
 * desktop value) the first annotation starts where the birds are, and there
 * is nowhere on a phone-width hero for them to go that is not on top of
 * something.
 */

const CARDS = [
  {
    tag: "Research",
    dot: "bg-bsl-forest",
    title: "AI-moderated",
    body: "Every participant gets a real interview, with follow-ups",
  },
  {
    tag: "Signals",
    dot: "bg-bsl-butter",
    title: "In their words",
    body: "Pain, timing, and role, pulled from the transcript",
  },
  {
    tag: "Routing",
    dot: "bg-bsl-sage-mid",
    title: "Straight to CRM",
    body: "Qualified leads assigned to a rep, with full context",
  },
];

export function SkyHero({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <section
      id="top"
      className="relative flex min-h-[max(100vh,760px)] overflow-hidden bg-bsl-sky"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 55% 60% at 72% 8%, rgba(255,236,196,.95) 0%, rgba(247,214,160,.55) 22%, rgba(247,214,160,0) 60%)",
            "linear-gradient(180deg, rgb(var(--bsl-sky)) 0%, rgb(var(--bsl-sky-mid)) 38%, rgb(var(--bsl-sky-pale)) 66%, rgb(var(--bsl-horizon)) 100%)",
          ].join(","),
        }}
      />

      <HeroFlock />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(16,22,18,.28) 0%, rgba(16,22,18,0) 22%, rgba(16,22,18,0) 50%, rgba(16,22,18,.62) 100%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-[1480px] grid-cols-1 items-end gap-[48px] px-[24px] pb-[56px] pt-[240px] bsl-wide:grid-cols-[minmax(0,1fr)_300px] bsl-wide:px-[48px] bsl-wide:pt-[140px]">
        <div className="max-w-[880px]">
          <div className="mb-[18px] origin-left rotate-[-6deg] font-bsl-hand text-[40px] font-medium text-bsl-cream">
            ✓ Qualified
          </div>
          <div className="mb-[22px] text-[15px] uppercase tracking-[0.08em] text-bsl-cream">
            Interview-led pipeline for B2B revenue teams
          </div>
          <h1 className="m-0 text-balance font-bsl-serif text-[clamp(56px,8vw,124px)] font-normal leading-[0.94] tracking-[-0.025em] text-bsl-cream">
            Turn your audience into pipeline.
          </h1>
          <p className="m-0 mt-[28px] max-w-[620px] text-pretty text-[21px] leading-[1.45] text-bsl-cream-soft">
            Birdsong agents find the right people, talk to them, and route qualified
            opportunities straight to your sales team.
          </p>
          <div className="mt-[36px] flex flex-wrap gap-[12px]">
            <a href={bookDemoUrl} className={`${bslSolid} px-[26px] py-[16px] text-[17px]`}>
              Book a demo <span aria-hidden className="font-bsl-glyph">→</span>
            </a>
            <a href="#how" className={`${bslGlass} px-[26px] py-[16px] text-[17px]`}>
              See how it works
            </a>
          </div>
        </div>

        {/* The glass stack: one translucent pane holding three near-opaque
            cards, rather than three separately-frosted cards. The 8px gutter
            between them is the pane showing through, which is what makes the
            sky read as *behind* the group instead of between the cards. */}
        <div className="flex flex-col gap-[8px] rounded-[22px] border border-bsl-cream/25 bg-bsl-cream/[0.16] p-[8px] backdrop-blur-[10px]">
          {CARDS.map((c) => (
            <div
              key={c.tag}
              className="rounded-[16px] bg-bsl-cream/[0.94] px-[20px] py-[22px] text-center"
            >
              <div className="flex items-center justify-center gap-[8px] text-[12px] font-normal uppercase tracking-[0.08em] text-bsl-body-soft">
                {/* A square, not a dot — the only unrounded swatch on the
                    page, and the handoff is specific about it. */}
                <span aria-hidden className={`h-[8px] w-[8px] ${c.dot}`} />
                {c.tag}
              </div>
              <div className="my-[12px] mb-[10px] text-balance font-bsl-serif text-[38px] leading-[1.02] text-bsl-ink">
                {c.title}
              </div>
              <div className="text-[15px] leading-[1.35] text-bsl-body">{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
