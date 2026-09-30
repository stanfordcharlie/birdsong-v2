/**
 * The three button treatments the sky direction uses, as class strings rather
 * than a component: every instance is an anchor that differs only in padding
 * and type size, so a component would be a wrapper around one `className`.
 *
 * inline-block, not inline-flex. Every one of these is a single line of text,
 * so flex buys nothing — and it costs something: the space in
 * "Book a demo <arrow>" sits between two flex items, where CSS drops it, and
 * the arrow ends up jammed against the label. As an inline run the space is
 * just a space. Vertical centring comes from the line box, which is what the
 * handoff's own markup relies on.
 *
 * `bslGlass` is the secondary on a dark ground (hero, final CTA) — a 12%
 * cream wash behind a 40% cream hairline. It has no cream-ground counterpart:
 * the nav's "Log in" is a solid --bsl-cream-alt fill instead, because at the
 * top of the hero it is sitting on sky and needs to stay legible once the bar
 * goes solid cream too.
 */
export const bslSolid =
  "inline-block rounded-[12px] bg-bsl-cream text-center font-medium text-bsl-ink transition-colors hover:bg-white";

export const bslGlass =
  "inline-block rounded-[12px] border border-bsl-cream/40 bg-bsl-cream/[0.12] text-center font-medium text-bsl-cream transition-colors hover:bg-bsl-cream/25";

export const bslForest =
  "inline-block rounded-[12px] bg-bsl-forest text-center font-medium text-bsl-cream transition-colors hover:bg-bsl-forest-deep";
