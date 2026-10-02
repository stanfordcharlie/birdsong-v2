"use client";

import { BirdMark } from "@/components/marketing/home/v3/BirdMark";
import { cn } from "@/lib/utils";
import { StudyThemeToggle } from "./StudyTheme";

// The pieces every respondent screen shares in the sky direction
// (design_handoff_respondent_survey_sky): the glow washes over the gradient,
// the drifting flock, the frosted header pill, the frosted card and the
// powered-by footer.
//
// Everything paints from the --study-* tokens (app/globals.css, `.study-sky`),
// so all of it follows the day/night toggle. No raw hex here — a literal
// cannot switch, and one is enough to make a themed screen look broken. The
// two exceptions are both deliberate and marked at their call site.
//
// The mark itself is the homepage's BirdMark, not a second copy: matching the
// marketing page is the whole point of this restyle, and that component draws
// the eye as a hole on an `evenodd` path with `currentColor` as its fill, so
// the same element works on the sky, on cream and on an ink circle without
// being told which ground it is sitting on.

/** The sun glow and the low corner wash, over the gradient the shell paints. */
export function SkyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(900px 520px at 78% -6%, var(--study-glow), transparent 62%), radial-gradient(700px 380px at 12% 108%, rgba(255,255,255,.14), transparent 70%)",
      }}
    />
  );
}

// [left %, top px, width px]. The handoff's own coordinates, in its own order.
// Percentages horizontally and px vertically, inside a fixed 110px band: the
// flock keeps its shape as the window widens, but the birds themselves do not
// scale with it, so they read as fixed-size birds at varying distance rather
// than as one bird zoomed.
const FLOCK: Array<[number, number, number]> = [
  [4, 42, 36],
  [19, 6, 22],
  [28, 62, 46],
  [35, 70, 16],
  [44, 4, 28],
  [50, 28, 14],
  [56, 58, 22],
  [65, 0, 36],
  [75, 52, 22],
  [82, 16, 18],
  [90, 76, 16],
  [97, 18, 14],
];

/**
 * Twelve birds crossing the top-right of the sky. Decorative only, and
 * hidden below 1100px by `.study-flock` (app/globals.css) — the sky is mostly
 * behind the content at that width and the birds start landing on the
 * headline.
 *
 * The drift is one animation on the group rather than twelve on the birds, so
 * they hold their formation; it is bound only under prefers-reduced-motion:
 * no-preference, and the resting state is the flock's final position.
 */
export function SkyFlock() {
  return (
    <div
      aria-hidden="true"
      className="study-flock pointer-events-none absolute right-[3%] top-[92px] h-[110px] w-[44%] text-study-flock"
    >
      <div className="study-glide absolute inset-0">
        {FLOCK.map(([left, top, width], i) => (
          <BirdMark
            key={i}
            width={width}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}px` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The frosted header pill: the wordmark, an optional progress row and the
 * theme toggle.
 *
 * The bar is frosted rather than tinted — a white wash over a 16px blur takes
 * its colour from the sky behind it — which is what lets one treatment sit on
 * both the day gradient and the night one. Same reasoning as the homepage nav.
 */
export function SkyHeader({
  progressPercent,
  isTest = false,
}: {
  /**
   * How far through the interview, 0-100, or undefined on the screens that
   * have no progress to show. A continuous bar, not one pip per question:
   * see the note in ./progress.ts for why the respondent is never told how
   * many questions are left.
   */
  progressPercent?: number;
  isTest?: boolean;
}) {
  return (
    <header className="relative z-20 flex-shrink-0 px-[16px] pt-[clamp(12px,2vh,22px)] sm:px-[32px]">
      <div className="flex items-center gap-[20px] rounded-full border border-study-glass-line bg-study-glass py-[10px] pl-[16px] pr-[10px] backdrop-blur-[16px] sm:pl-[24px]">
        {/* Deliberately not a link. The respondent is mid-interview and the
            study is run on a client's behalf, so handing them a route to
            usebirdsong.com tells them who is behind it — which is the one
            thing the interview cannot afford to volunteer. The lockup still
            renders; it just does not navigate. */}
        <div className="flex flex-shrink-0 items-center gap-[10px] text-study-ink">
          <BirdMark width={30} />
          <span className="font-study-display text-[19px] font-semibold tracking-[-0.02em] sm:text-[22px]">
            Birdsong
          </span>
        </div>

        {/* The owner's preview marker. Inside the pill rather than floating in
            the corner, where it would sit on top of the theme toggle. */}
        {isTest && (
          <span className="flex-shrink-0 rounded-full border border-study-glass-line px-[10px] py-[3px] text-[11px] font-medium uppercase tracking-[0.1em] text-study-cream">
            Test mode
          </span>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-center">
          {progressPercent !== undefined && (
            <div
              className="h-[4px] w-full max-w-[320px] overflow-hidden rounded-[2px] bg-white/[0.28]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              aria-label="Interview progress"
            >
              <div
                className="h-full rounded-[2px] bg-study-cream transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        <StudyThemeToggle />
      </div>
    </header>
  );
}

/** "Powered by 🐦 Birdsong", centred under every screen. */
export function StudyFooter() {
  return (
    <footer className="study-footer relative z-10 flex flex-shrink-0 items-center justify-center gap-[9px] px-[32px] pb-[clamp(10px,2vh,30px)] pt-[clamp(8px,1.6vh,22px)] text-[14px] text-study-ink">
      <span>Powered by</span>
      {/* Not a link, for the same reason as the header lockup above. */}
      <span className="inline-flex items-center gap-[7px]">
        <BirdMark width={18} />
        <span className="text-[16px] font-semibold">Birdsong</span>
      </span>
    </footer>
  );
}

/**
 * The frosted cream card: the welcome screen's interviewer panel, the
 * question screen's answer box and the thank-you transcript all share it.
 *
 * `backdrop-blur` on a translucent fill, so what is behind it is the sky it is
 * actually sitting on rather than a flat tint — which is what keeps the card
 * looking like one object across both themes.
 */
export function SkyCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-study-card-line bg-study-card text-study-ink shadow-study-float backdrop-blur-[18px]",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * "YOUR INTERVIEWER", with the mark in a circle.
 *
 * Two grounds, one row: `on="card"` is the welcome card's ink circle with a
 * cream bird, `on="sky"` is the question screen's cream circle with an ink
 * bird. The label's size and tracking differ between them in the handoff, so
 * they are not one scaled copy.
 */
export function InterviewerRow({ on, className }: { on: "card" | "sky"; className?: string }) {
  const isCard = on === "card";
  return (
    <div className={cn("flex items-center gap-[12px]", className)}>
      <span
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-full",
          // The card's circle flips with its ground, so it can use the
          // tokens. The sky's cannot: --study-cream is the same cream in both
          // themes, so the bird on it has to be the day ink in both themes
          // too — using --study-ink would paint a cream bird on a cream disc
          // at night. One of this surface's two deliberate literals.
          isCard
            ? "h-[36px] w-[36px] bg-study-ink text-study-chip"
            : "h-[34px] w-[34px] bg-study-cream text-[#1f1c18]"
        )}
      >
        <BirdMark width={isCard ? 18 : 17} />
      </span>
      <span
        className={cn(
          "font-medium uppercase",
          isCard
            ? "text-[13px] tracking-[0.12em] text-study-muted"
            : "text-[14px] tracking-[0.14em] text-study-cream"
        )}
      >
        Your interviewer
      </span>
    </div>
  );
}

/**
 * The interviewer is composing the next question.
 *
 * Three cream dots on the sky rather than the shared BirdLoader: that loader
 * is a near-black bird with a cream eye, drawn for the eggshell surfaces, and
 * it reads as a smudge on the day gradient and disappears entirely on the
 * night one. Same `miniDot` keyframes, so the two still pulse in step
 * wherever both appear.
 *
 * Mounted only behind the same useLoadingGate the BirdLoader was, so a fast
 * answer still shows nothing at all rather than a flash of this.
 */
export function ThinkingDots({ label = true }: { label?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[10px] text-[15px] text-study-cream"
      role={label ? undefined : "status"}
      aria-label={label ? undefined : "Loading"}
    >
      {label && <span>Thinking</span>}
      <span aria-hidden="true" className="flex gap-[4px]">
        {[0, 0.16, 0.32].map((delay) => (
          <span
            key={delay}
            className="h-[5px] w-[5px] rounded-full bg-current motion-reduce:![animation:none] motion-reduce:opacity-60"
            style={{ animation: `miniDot 1.3s ease ${delay}s infinite` }}
          />
        ))}
      </span>
    </span>
  );
}

/** The arrow inside every primary button. See `study-glyph` in the Tailwind
    config for why it is set in system-ui rather than Instrument Sans. */
export function StudyArrow() {
  return (
    <span aria-hidden="true" className="font-study-glyph">
      &rarr;
    </span>
  );
}

/**
 * An error the respondent has to be able to read, on a card fill rather than
 * straight on the sky: neither theme's red clears contrast against the
 * gradient, and the one that would (a pale warm red) reads as the key-phrase
 * highlight.
 */
export function StudyError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "w-fit rounded-[12px] border border-study-hair bg-study-chip px-[14px] py-[8px] text-[14px] leading-[1.45] text-study-danger",
        className
      )}
    >
      {children}
    </p>
  );
}
