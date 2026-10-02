"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { bricolage, instrumentSans, instrumentSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// Theme state for the respondent survey only. The tokens themselves live in
// app/globals.css under `.study-sky`; this decides which of the two sets that
// class resolves to.
//
// The design calls them day and night (design_handoff_respondent_survey_sky);
// they are this component's existing light and dark, renamed in the copy a
// respondent reads and nowhere else — the stored value, the data attribute and
// the token selector are all unchanged, so a tab that stored "dark" before the
// restyle still opens on night.
//
// Day always wins by default. prefers-color-scheme is deliberately not
// consulted: a respondent on a dark-set phone still opens the survey on the
// day sky, and night is reached only by tapping the toggle. That keeps the
// first impression of the conversation identical for everyone.
type Theme = "light" | "dark";

// sessionStorage, not localStorage — the app deliberately keeps nothing
// persistent in the browser (same rule the interview session pointer follows),
// and a respondent answers one survey once, so the preference has no reason
// to outlive the tab.
const STORAGE_KEY = "bs-survey-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    // Private-mode Safari and some embedded webviews throw on any
    // sessionStorage access. A survey link opened there must still work, so
    // the preference simply becomes in-memory for that session.
    return "light";
  }
}

const ThemeContext = createContext<{
  /** What is on screen right now. Always "light" until the respondent taps. */
  theme: Theme;
  toggle: () => void;
} | null>(null);

export function useStudyTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useStudyTheme must be used inside StudyThemeProvider");
  return ctx;
}

// Below this, a visual-viewport shrink is the URL bar collapsing or a
// find-in-page bar, not a keyboard — re-anchoring the screen for those would
// be a visible jolt for no reason.
const KEYBOARD_MIN_INSET_PX = 120;

// How much of the layout viewport the on-screen keyboard is covering, or 0
// when it is closed.
//
// No CSS unit reports this. dvh shrinks for browser toolbars but *not* for the
// keyboard — on iOS the keyboard is painted over the layout viewport without
// resizing it at all — so a composer pinned to the bottom of a 100dvh shell
// ends up underneath it. window.visualViewport is the only API that describes
// the box the respondent can actually see, hence measuring here and handing
// the number to CSS as a custom property (see the .study-viewport
// [data-keyboard="open"] rules in app/globals.css). offsetTop is subtracted
// because iOS scrolls the visual viewport within the layout viewport when
// focusing a field near the bottom; without it the inset reads short by that
// amount.
//
// It lives on the provider rather than on one screen because every screen in
// the flow is the same fixed-height shell, and two of them (the intake form
// and the question) take typing.
function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > KEYBOARD_MIN_INSET_PX ? Math.round(covered) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

export function StudyThemeProvider({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Starts light on both server and first client render so the markup matches
  // and hydration is clean. A stored choice is applied on mount — the only
  // case that can flash is a respondent who already picked dark and then
  // reloaded, which is a deliberate trade for never mis-rendering the default.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        window.sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage unavailable: the choice still holds for this render tree,
        // it just won't survive a reload. Better than failing the tap.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  const keyboardInset = useKeyboardInset();

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={cn(
          // The three faces the homepage ships, scoped here rather than in
          // app/layout.tsx so admin and the marketing pages never download
          // them for a surface they do not render.
          instrumentSerif.variable,
          instrumentSans.variable,
          bricolage.variable,
          "study-sky font-study-sans text-study-cream antialiased",
          className
        )}
        // Only night needs stamping — the base `.study-sky` rule is already
        // the day palette, so day is the absence of an override.
        data-theme={theme === "dark" ? "dark" : undefined}
        data-keyboard={keyboardInset > 0 ? "open" : undefined}
        style={{
          "--kb-inset": `${keyboardInset}px`,
          // The gradient, and the .6s cross-fade the toggle rides. Both
          // tokens flip with data-theme, so the transition is the whole
          // change: no second background, no fade-through-white.
          background: "var(--study-sky)",
          transition: "background 0.6s ease",
          ...style,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The day/night switch, which lives in the header pill (SkyChrome's
 * SkyHeader) rather than floating in a corner of the sky.
 *
 * Ink fill with a chip-coloured glyph, in both themes: because both tokens
 * flip together the button reads as near-black on the day sky and as cream at
 * night, which is the one control on the screen that should swap rather than
 * hold its colour. A moon by day and a sun at night — the icon is the
 * destination, not the current state, and the label says the same thing.
 */
export function StudyThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useStudyTheme();
  const goingTo = theme === "dark" ? "day" : "night";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${goingTo}`}
      title={`Switch to ${goingTo}`}
      className={cn(
        "flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full bg-study-ink text-study-chip",
        // The ring offset follows the sky rather than white, which is what
        // keeps the focus ring readable in both themes.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-study-cream focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className
      )}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
