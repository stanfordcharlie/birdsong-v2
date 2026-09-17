/**
 * The two button treatments the v2 home page uses, as class strings rather
 * than a component: every instance is an anchor with different padding and
 * type size, so a component would be a wrapper around one `className`.
 *
 * Primary inverts to green on hover; secondary inverts to the ink fill.
 */
export const hpPrimary =
  "inline-flex items-center gap-[6px] rounded-[4px] bg-hp-ink text-hp-cream transition-colors hover:bg-hp-green";

export const hpSecondary =
  "inline-flex items-center rounded-[4px] border border-hp-ink bg-transparent text-hp-ink transition-colors hover:bg-hp-ink hover:text-hp-cream";
