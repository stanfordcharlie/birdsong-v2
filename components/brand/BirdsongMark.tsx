/**
 * The Birdsong mark. One component, every surface.
 *
 * The master is public/brand/birdsong-mark-black.svg; this is the same path
 * inlined, because the mark has to take its colour from whatever it sits on
 * and an <img> cannot. The two kept in step by hand: one path, one viewBox.
 *
 * Colour is `currentColor`, never a token or a literal. Every surface the
 * mark appears on already sets a text colour that is correct against its own
 * ground (ink on the cream landing pages, cream on the sky and on the dark
 * CTA panel, and the respondent study's --sv-ink, which flips with
 * data-theme), so inheriting is what makes one file work in light and dark
 * without a second asset. A call site that needs to break from the text
 * around it passes `style={{ color: ... }}`.
 *
 * The eye is a hole, not a dot: a second subpath on the same `evenodd` path.
 * That is what lets the fill be a single colour; a filled circle would have
 * to know what the mark was sitting on.
 *
 * `size` is the width. Height derives from the 50x44 viewBox unless a call
 * site passes its own, which several do: the marketing lockups were drawn
 * at 24x22, 26x24, 22x20 and 38x35, all slightly squarer than the viewBox,
 * and squashing them to the exact ratio would move the layout around them.
 */
export function BirdsongMark({
  size = 24,
  height,
  className,
  style,
}: {
  size?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 50 44"
      width={size}
      height={height ?? (size * 44) / 50}
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M7 1.5 C9 9 15 13.6 23 14 C32 14.4 37.9 21 37.3 31 L45.3 34.6 L36.4 36.5 C34 39.5 30.5 41 26 41 L7 41 L17 28.5 C8 27.5 2 21.5 2 14 C2 8.5 4 4.5 7 1.5 Z M32 22.8 A1.9 1.9 0 1 0 32 26.9 A1.9 1.9 0 1 0 32 22.8 Z"
      />
    </svg>
  );
}
