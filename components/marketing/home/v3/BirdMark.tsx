/**
 * The Birdsong mark (birdsong-skyblue-icon-2026-10), and the one copy the
 * sky surfaces share — the homepage nav and flock, the respondent survey's
 * SkyChrome, the transcript avatar.
 *
 * The eye is a second subpath on the same `evenodd` path rather than its own
 * <circle>, so it is a hole: the mark works on the sky, on cream, on forest
 * and on the CTA's dark panel without any call site having to say what it is
 * sitting on. That also lets the fill be `currentColor`, which is what the
 * nav needs — the mark cross-fades from cream to ink with the wordmark beside
 * it as the bar goes solid, and a single inherited colour does that for free.
 *
 * Height is derived, not passed: the viewBox is 50x44, and every call site
 * sizes by width alone (34 nav, 36px-down flock, 17 transcript avatar).
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
      viewBox="0 0 50 44"
      width={width}
      height={(width * 44) / 50}
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
