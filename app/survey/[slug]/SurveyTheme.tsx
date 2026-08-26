"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Theme state for the respondent survey only. The tokens themselves live in
// app/globals.css under `.survey-theme`; this decides which of the two sets
// that class resolves to.
//
// Light always wins by default. prefers-color-scheme is deliberately not
// consulted: a respondent on a dark-set phone still opens the survey in light,
// and dark is reached only by tapping the toggle. That keeps the first
// impression of the conversation identical for everyone.
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

export function useSurveyTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useSurveyTheme must be used inside SurveyThemeProvider");
  return ctx;
}

export function SurveyThemeProvider({
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

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={cn("survey-theme", className)}
        // Only dark needs stamping — the base `.survey-theme` rule is already
        // the light palette, so light is the absence of an override.
        data-theme={theme === "dark" ? "dark" : undefined}
        style={style}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.6v2.2M12 19.2v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 13.4A8.2 8.2 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Sits in the top corner opposite the test-mode badge, at the same inset, so
// the two never collide when an owner is previewing. Deliberately quiet: this
// is a respondent's conversation, and a control they are unlikely to want
// should not compete with the question they are being asked.
export function SurveyThemeToggle({
  className,
  // The Test-mode badge owns right-4/top-4 during an owner preview, so the
  // toggle drops below it rather than sitting on top of it.
  offsetForBadge = false,
}: {
  className?: string;
  offsetForBadge?: boolean;
}) {
  const { theme, toggle } = useSurveyTheme();
  const goingTo = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${goingTo} mode`}
      title={`Switch to ${goingTo} mode`}
      className={cn(
        "fixed right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-survey-border bg-survey-surface text-survey-muted transition-colors",
        offsetForBadge ? "top-[58px]" : "top-4",
        "hover:text-survey-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-survey-accent focus-visible:ring-offset-2",
        // Matches the ring-offset to the page rather than to white, which is
        // what keeps the focus ring readable in both themes.
        "focus-visible:ring-offset-survey-ground",
        className
      )}
      style={{ boxShadow: "var(--sv-shadow-soft)" }}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
