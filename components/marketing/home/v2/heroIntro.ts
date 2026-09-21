/**
 * Shared names for the `/` hero's page-load intro. Three files agree on them:
 * HeroIntroGate's inline script (arms the intro before first paint),
 * useHeroIntro (measures, then releases it) and the `hp-i-*` rules in
 * app/globals.css (hide the start state, run the keyframes). Kept in one
 * place so a rename cannot leave the page permanently hidden.
 *
 * The lifecycle is two switches on <html>:
 *   data-intro="play"   set by the gate script when this is the first visit
 *                       of the session and reduced motion is off. Every
 *                       animated element is held in its start state. Absent
 *                       in all other cases, so SSR's final state shows as-is.
 *   .hp-intro-go        added by useHeroIntro once the perch and the nav slot
 *                       have been measured. Only then do the keyframes start.
 *
 * The class lives on <html>, not the hero root, because the nav pill is a
 * sibling of the hero and animates on the same clock.
 */
export const INTRO_ATTR = "data-intro";
export const INTRO_PLAY = "play";
export const INTRO_GO_CLASS = "hp-intro-go";
export const INTRO_SESSION_KEY = "hp-intro-seen";

/** How long the gate waits for the client bundle before giving the page back. */
export const INTRO_BUNDLE_TIMEOUT_MS = 5000;

/** Perch / nav slot hooks the measurement script queries. */
export const PERCH_ATTR = "data-intro-perch";
export const NAV_BIRD_ATTR = "data-intro-nav-bird";
export const HERO_ATTR = "data-intro-hero";

/** The bird box (see .hp-i-bird). The flight scale is navSlotWidth / this. */
export const BIRD_W = 72;
export const BIRD_H = 66;
