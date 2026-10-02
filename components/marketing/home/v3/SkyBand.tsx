/**
 * One sky behind three sections.
 *
 * Before v4 the hero painted its own gradient and the two sections under it
 * were flat cream, so the page had a hard edge at the bottom of the hero and
 * the sky was a thing the hero had rather than a thing the page was in. v4
 * made it one object: this wrapper holds a single absolute gradient layer
 * (--bsl-sky-band in globals.css) and the hero, the conversation section and
 * the steps all render transparent on top of it.
 *
 * Because the ramp is in percentages of this wrapper, the colour at any point
 * depends on the total height of all three sections — so the sections cannot
 * set their own backgrounds, and the band cannot be split in two without the
 * stops moving. That is the trade: one seamless sky, at the cost of three
 * sections that are no longer independently reorderable.
 *
 * The ramp reaches cream at 80% and holds it, which is what gives the steps
 * section a flat page-coloured ground to finish on. The CTA below this
 * wrapper then starts its own ramp from that same cream, so the join is
 * invisible without the two gradients having to know each other's heights.
 *
 * `isolate`: the hero's readability scrim hangs 420px below the hero's own
 * box, and the CTA sets a mix-blend-mode grain. Giving this wrapper its own
 * stacking context keeps the blend from reaching back up into the band.
 */
export function SkyBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "var(--bsl-sky-band)" }}
      />
      {children}
    </div>
  );
}
