import {
  INTRO_ATTR,
  INTRO_BUNDLE_TIMEOUT_MS,
  INTRO_GO_CLASS,
  INTRO_PLAY,
  INTRO_SESSION_KEY,
} from "./heroIntro";

/**
 * Arms the hero's page-load intro before the hero paints.
 *
 * Rendered first thing in app/page.tsx, so the browser runs it while parsing,
 * before the nav and hero markup that follows. If this is the session's first
 * visit and the visitor has not asked for reduced motion, it stamps
 * `data-intro="play"` on <html>, which is what app/globals.css keys the
 * hidden start state off. Every other case (a reload in the same session,
 * reduced motion, JS off, sessionStorage throwing in a locked-down browser)
 * leaves the attribute off and the page renders its final state straight
 * from SSR with nothing to flash.
 *
 * The timeout is a safety net for the case where the HTML arrives but the
 * client bundle does not (or is very slow): the page must never stay hidden
 * waiting for a measurement that is not coming.
 */
const GATE_SCRIPT = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var k="${INTRO_SESSION_KEY}";if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");var h=document.documentElement;h.setAttribute("${INTRO_ATTR}","${INTRO_PLAY}");setTimeout(function(){if(!h.classList.contains("${INTRO_GO_CLASS}"))h.removeAttribute("${INTRO_ATTR}")},${INTRO_BUNDLE_TIMEOUT_MS})}catch(e){}})();`;

export function HeroIntroGate() {
  return <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />;
}
