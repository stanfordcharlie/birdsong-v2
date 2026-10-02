// The Birdsong mark (birdsong-skyblue-icon-2026-10) as the marketing landing
// pages draw it. Used at 24x22 (nav), 26x24 (footer), 22x20 (legal pages) and
// 38x35 (final CTA, wrapped with the takeoff animation by LandingCta).
//
// The eye is a hole punched through the ink silhouette — a second subpath on
// the same `evenodd` path — so it shows whatever the mark is sitting on
// rather than a fixed light color. This used to be a separate <circle> whose
// fill each call site had to supply (the footer sits on --lp-surface, the nav
// and CTA on --lp-bg); with a real cut-out none of them has to know.
export function BirdMark({
  width = 24,
  height = 22,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 50 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="var(--lp-ink)"
        d="M7 1.5 C9 9 15 13.6 23 14 C32 14.4 37.9 21 37.3 31 L45.3 34.6 L36.4 36.5 C34 39.5 30.5 41 26 41 L7 41 L17 28.5 C8 27.5 2 21.5 2 14 C2 8.5 4 4.5 7 1.5 Z M32 22.8 A1.9 1.9 0 1 0 32 26.9 A1.9 1.9 0 1 0 32 22.8 Z"
      />
    </svg>
  );
}
