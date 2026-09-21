"use client";

import { useEffect, type RefObject } from "react";
import {
  BIRD_W,
  HERO_ATTR,
  INTRO_ATTR,
  INTRO_GO_CLASS,
  INTRO_PLAY,
  NAV_BIRD_ATTR,
  PERCH_ATTR,
} from "./heroIntro";

/**
 * Where the bird's centre sits relative to the perch point, given the box in
 * .hp-i-bird: 72×66 with margin -64px 0 0 -30px puts the box's centre at
 * (perch.x - 30 + 36, perch.y - 64 + 33).
 */
const CENTRE_DX = 6;
const CENTRE_DY = -31;

/** Top of a capital in Instrument Serif at line-height 1, as a share of 1em. */
const CAP_TOP = 0.16;

/** How long to wait for fonts before starting anyway. */
const FONTS_TIMEOUT_MS = 800;

/**
 * Measures the hero for the intro and writes the result as custom properties
 * on the hero root, then releases the animations by adding INTRO_GO_CLASS to
 * <html>. See heroIntro.ts for the lifecycle and app/globals.css (hp-i-*)
 * for the keyframes that consume the properties:
 *
 *   --px / --py  perch point (top-centre of the "T"), relative to the hero
 *   --tx / --ty  flight delta: nav slot centre minus bird centre
 *   --sc         flight end scale: nav slot width / bird box width
 *   --ax / --ay  arrival start offset: fully off the left edge, a little up
 *
 * Runs on mount, again when fonts are ready (that is what moves the "T"),
 * and on resize. Nothing here runs unless the gate script armed the intro;
 * on a return visit this hook is a no-op and the bird stays display:none.
 *
 * The perch is a plain inline span so the "T"–"u" kerning survives and
 * screen readers see one uninterrupted heading. Its rect is therefore the
 * glyph's content area, not the line box; lineTop recovers the line box top
 * from it (the content area is centred in the line at line-height 1), which
 * is the same number an inline-block perch would report directly.
 */
export function useHeroIntro(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute(INTRO_ATTR) !== INTRO_PLAY) return;

    const hero = ref.current?.closest<HTMLElement>(`[${HERO_ATTR}]`);
    if (!hero) return;

    const measure = () => {
      const perch = hero.querySelector<HTMLElement>(`[${PERCH_ATTR}]`);
      const navBird = document.querySelector<HTMLElement>(`[${NAV_BIRD_ATTR}]`);
      if (!perch || !navBird) return false;

      const heroRect = hero.getBoundingClientRect();
      const p = perch.getBoundingClientRect();
      const fontSize = parseFloat(getComputedStyle(perch).fontSize);
      if (!p.width || !fontSize) return false;

      const lineTop = p.top + (p.height - fontSize) / 2;
      const perchX = p.left + p.width / 2;
      const perchY = lineTop + fontSize * CAP_TOP;

      const birdCx = perchX + CENTRE_DX;
      const birdCy = perchY + CENTRE_DY;

      // The slot's centre from its rect (its land bounce scales about that
      // centre, so a re-measure mid-intro still finds it), but its width from
      // layout, which that bounce does not touch.
      const n = navBird.getBoundingClientRect();
      const tx = n.left + n.width / 2 - birdCx;
      const ty = n.top + n.height / 2 - birdCy;
      const sc = navBird.offsetWidth / BIRD_W;

      const ax = -(birdCx + BIRD_W);
      const ay = -Math.min(220, Math.max(0, birdCy * 0.35));

      const s = hero.style;
      s.setProperty("--px", `${perchX - heroRect.left}px`);
      s.setProperty("--py", `${perchY - heroRect.top}px`);
      s.setProperty("--tx", `${tx}px`);
      s.setProperty("--ty", `${ty}px`);
      s.setProperty("--sc", `${sc}`);
      s.setProperty("--ax", `${ax}px`);
      s.setProperty("--ay", `${ay}px`);
      return true;
    };

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      measure();
      html.classList.add(INTRO_GO_CLASS);
    };

    measure();

    const timer = window.setTimeout(release, FONTS_TIMEOUT_MS);
    const fontsReady: Promise<unknown> | undefined = document.fonts?.ready;
    let cancelled = false;
    fontsReady?.then(() => {
      if (!cancelled) release();
    });

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measure());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [ref]);
}
