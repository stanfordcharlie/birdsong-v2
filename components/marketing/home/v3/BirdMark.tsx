/**
 * The Birdsong mark, as the sky direction draws it
 * (design_handoff_birdsong_landing, `Birdsong Landing.dc.html`).
 *
 * Same outline as components/marketing/BirdMark.tsx, drawn differently on
 * purpose: there the eye is a separate <circle> filled with whatever the mark
 * happens to be sitting on, which means every call site has to know its own
 * background. Here the eye is a second subpath on the same `evenodd` path, so
 * it is a hole — the mark works on the sky, on cream, on forest and on the
 * CTA's dark panel without being told which.
 *
 * That also lets the fill be `currentColor`, which is what the nav needs: the
 * mark has to cross-fade from cream to ink with the wordmark beside it as the
 * bar goes solid, and a single inherited colour does that for free.
 *
 * Height is derived, not passed: the viewBox is 48x44, and every size in the
 * handoff (34x31 nav, 36px-down flock, 17x16 transcript avatar) is that ratio.
 *
 * v5 detaches the beak. It used to be drawn as part of the head outline — the
 * contour ran out to a point at (44.5, 34.5) and straight back — and is now a
 * third subpath, a closed triangle sitting in clear air to the right of a head
 * that closes on its own. The gap is the point of the change, so the two must
 * stay on one <path>: as separate elements an `opacity` or a `currentColor`
 * applied at a call site could land on one and not the other.
 */
export function BirdMark({
  width,
  className,
  style,
}: {
  width: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 48 44"
      width={width}
      height={(width * 44) / 48}
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 C37.3 32.9 36.9 34 36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z M34.8 25.5 A1.8 1.8 0 1 0 31.2 25.5 A1.8 1.8 0 1 0 34.8 25.5 Z M42.4 32.4 L48 34.6 L41.8 35.8 Z"
      />
    </svg>
  );
}
