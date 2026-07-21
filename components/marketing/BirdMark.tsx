// Bird silhouette for the marketing landing pages
// (design_handoff_landing_pages_full) — a different mark from the platform
// sidebar/respondent-flow bird (components/AdminSidebar.tsx, PerchedBird),
// drawn fresh for this handoff. Used at 24x22 (nav), 19x17 (footer), and
// 40x37 (final CTA, wrapped with the takeoff animation by LandingCta).
//
// The eye is a literal hole punched through the ink silhouette, filled with
// the page background color rather than a fixed light color — same trick
// the source file uses (`fill="var(--bg)"`), so it stays correct whichever
// tone (cream/eggshell) the page is in.
export function BirdMark({
  width = 24,
  height = 22,
  showEye = true,
  className,
}: {
  width?: number;
  height?: number;
  // Footer's bird drops the eye dot at that small size, per the source —
  // nav and the final CTA keep it.
  showEye?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
        fill="var(--lp-ink)"
      />
      {showEye && <circle cx="33" cy="25.5" r="1.8" fill="var(--lp-bg)" />}
    </svg>
  );
}
