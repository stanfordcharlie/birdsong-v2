"use client";

import { cn } from "@/lib/utils";

// The pieces every respondent screen shares: the ambient backdrop, the bird
// mark, the pill arrow, the powered-by lockup and the test-mode pill. They
// were inlined per stage in InterviewFlow (the welcome and completion screens
// each carried their own copy of the backdrop); one definition here is what
// keeps the four stages sitting on the same ground.
//
// Everything reads the --sv-* tokens (app/globals.css, `.survey-theme`), so
// all of it follows the light/dark toggle. No raw hex.

// The Birdsong mascot. Same 48x44 path as the marketing BirdMark, rendered
// here at several sizes with explicit fills (ink body + ground eye on the
// welcome cluster; ground body on the ink interviewer avatar; ink body in the
// footer), so it is inlined rather than routed through BirdMark's
// landing-token fills.
export function WelcomeBird({
  width,
  height,
  fill,
  eyeFill,
  className,
}: {
  width: number;
  height: number;
  fill: string;
  eyeFill?: string;
  className?: string;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 44" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
        fill={fill}
      />
      {eyeFill && <circle cx="33" cy="25.5" r="1.8" fill={eyeFill} />}
    </svg>
  );
}

// The decorative ambient layer from the welcome screen: two top radial
// washes, two blurred drifting blobs, three drifting note glyphs. Purely
// decorative, aria-hidden, pointer-events-none, so it never sits between the
// respondent and a field. Needs a `relative` parent. The drift loops
// (sw-blob-*, sw-bgnote-*) live in globals.css and only run under
// prefers-reduced-motion: no-preference.
export function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(760px 420px at 24% -8%, var(--sv-tint-accent), transparent 60%), radial-gradient(760px 420px at 76% -10%, var(--sv-tint-info), transparent 60%)",
      }}
    >
      <div
        className="sw-blob-a absolute left-[6%] top-[-80px] h-[300px] w-[300px] rounded-full"
        style={{ background: "hsl(var(--sv-accent-bg))", opacity: 0.5, filter: "blur(70px)" }}
      />
      <div
        className="sw-blob-b absolute right-[5%] top-[-60px] h-[280px] w-[280px] rounded-full"
        style={{ background: "hsl(var(--sv-info-bg))", opacity: 0.55, filter: "blur(70px)" }}
      />
      <span className="sw-bgnote-a absolute left-[14%] top-[14%] text-[20px]" style={{ color: "hsl(var(--sv-accent))", opacity: 0.4 }}>
        &#9834;
      </span>
      <span className="sw-bgnote-b absolute right-[18%] top-[10%] text-[17px]" style={{ color: "hsl(var(--sv-info))", opacity: 0.4 }}>
        &#9835;
      </span>
      <span className="sw-bgnote-c absolute right-[9%] top-[64%] text-[15px]" style={{ color: "hsl(var(--sv-faint))", opacity: 0.45 }}>
        &#9834;
      </span>
    </div>
  );
}

// The arrow inside every dark pill in the flow.
export function PillArrow() {
  return (
    <svg width="20" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true">
      <path
        d="M1 6h18m0 0l-4-4.5M19 6l-4 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "Powered by ⟶ Birdsong": 13.5px faint label, the bird mark, then the
// Bricolage wordmark in ink. The lockup only; each stage's footer decides its
// own padding and reveal.
export function PoweredBy() {
  return (
    <>
      <span className="text-[13.5px] text-survey-faint">Powered by</span>
      <a href="/" className="inline-flex items-center gap-[7px]">
        <WelcomeBird width={17} height={15} fill="hsl(var(--sv-ink))" />
        <span className="font-bricolage text-[15px] font-bold text-survey-ink">Birdsong</span>
      </a>
    </>
  );
}

// The footer on the intake and question screens. Bottom-most element, so it
// owns clearing the iPhone home indicator. Hidden while the keyboard is up
// (globals.css .survey-footer) and the clearance goes with it, correctly,
// since the keyboard covers that strip anyway.
export function Footer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "survey-footer relative flex items-center justify-center gap-[9px] px-8 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] short:pt-2 short:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
        className
      )}
      style={style}
    >
      <PoweredBy />
    </div>
  );
}

// The owner's preview marker. Floats top-right at the handoff's inset; the
// theme toggle drops below it (SurveyThemeToggle offsetForBadge) so the two
// never collide.
export function TestModeBadge({ isTest }: { isTest: boolean }) {
  if (!isTest) return null;
  return (
    <span className="fixed right-6 top-[18px] z-20 rounded-full border border-survey-border bg-survey-surface px-3 py-1.5 text-[12.5px] font-semibold tracking-[0.04em] text-survey-faint">
      TEST MODE
    </span>
  );
}
