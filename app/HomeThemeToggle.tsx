"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function pageRoot(from: HTMLElement): HTMLElement | null {
  return from.closest<HTMLElement>(`.${styles.root}`);
}

/** What the visitor is looking at right now: the stored override if the
 *  root carries one, otherwise whatever the OS asks for. */
function effectiveTheme(root: HTMLElement | null): Theme {
  const set = root?.getAttribute("data-theme");
  if (set === "dark" || set === "light") return set;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * The letter's light/dark toggle. Fixed to the bottom-right corner (see
 * `.toggle` in page.module.css), reads "Dark mode" in light and "Light mode"
 * in dark. `storageKey` is the localStorage key the choice is remembered
 * under; app/page.tsx owns it, because its inline script reads the same key
 * before React runs.
 *
 * The visible label is chosen by CSS off the theme, so it is right from the
 * first paint. The aria-label is React state, known once mounted; until then
 * the button has no aria-label and its accessible name falls back to the one
 * label CSS leaves visible, which says the same thing.
 */
export function HomeThemeToggle({ storageKey }: { storageKey: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`.${styles.root}`);
    const sync = () => setTheme(effectiveTheme(root));
    sync();
    // While the visitor has not chosen, the page follows the OS, so the
    // label has to follow a live OS change too.
    const media = window.matchMedia(DARK_QUERY);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const root = pageRoot(event.currentTarget);
    if (!root) return;
    const next: Theme = effectiveTheme(root) === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Private mode or blocked storage: the choice still applies for this
      // visit, it just will not survive a reload.
    }
    setTheme(next);
  }

  const switchTo = theme === "dark" ? "light" : theme === "light" ? "dark" : null;

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={switchTo ? `Switch to ${switchTo} mode` : undefined}
    >
      <span className={styles.toDark}>Dark mode</span>
      <span className={styles.toLight}>Light mode</span>
    </button>
  );
}
