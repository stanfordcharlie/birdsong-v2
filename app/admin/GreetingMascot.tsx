// The Birdsong mascot beside the admin home greeting: the bird mark sits
// still for most of its cycle, then does a quick two-beat head-tilt while a
// pair of music notes rises off it.
//
// Every animation here is an existing globals.css class, not a new keyframe —
// `.sw-bird` (sw-bob, 6s) and `.sw-clusternote-a`/`-b` (sw-note-a/-b, 7s,
// staggered 1s) are the exact idle-then-tilt and note-rise loops the
// respondent survey welcome screen already uses. Reusing them also inherits
// their `prefers-reduced-motion: no-preference` gate for free: under reduced
// motion the bird simply renders static and the notes — which rest at
// opacity 0, being purely decorative — never appear at all.
//
// The mark is the same 48x44 swooping-bird path used across the platform,
// drawn in admin tokens rather than the marketing/respondent hexes: the body
// takes the page's ink and the eye takes the page background, so the eye
// reads as a cutout against whatever sits behind it.
export function GreetingMascot() {
  return (
    <div className="relative h-16 w-[120px] shrink-0" aria-hidden="true">
      <span className="sw-clusternote-a absolute left-[26px] top-0 text-[16px] leading-none text-success opacity-0">
        &#9834;
      </span>
      <span className="sw-clusternote-b absolute left-[66px] top-3.5 text-[13px] leading-none text-faint opacity-0">
        &#9835;
      </span>
      <svg
        width="40"
        height="37"
        viewBox="0 0 48 44"
        fill="none"
        className="sw-bird absolute bottom-0 left-10"
      >
        <path
          d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
          fill="hsl(var(--ds-card-foreground))"
        />
        <circle cx="33" cy="25.5" r="1.8" fill="hsl(var(--ds-page-background))" />
      </svg>
    </div>
  );
}
