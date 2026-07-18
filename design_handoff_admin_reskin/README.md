# Handoff: Birdsong Admin reskin (landing-matched, light + dark)

## Overview
A full reskin of the Birdsong **admin** to match the marketing **landing page** aesthetic — warm editorial look instead of the current white/indigo "vibe-coded" UI. One connected prototype covering all five admin screens (app shell + navigating icon rail), plus a **light/dark theme toggle** in Settings that re-skins the entire app and persists.

## About the Design File
`BirdsongAdmin.dc.html` is a **design reference built in HTML** against the Birdsong design system — a prototype showing intended look and behavior, **not** production code to copy verbatim. Recreate it in the target codebase (React app consuming `birdsong-ui`) using its established patterns.

⚠️ **This reskin intentionally departs from the current `birdsong-ui` visual tokens.** The library's `Button`/`Badge`/`Input` are hardcoded **indigo**; the new direction is **charcoal buttons + muted-green status**, on a warm cream (light) / warm charcoal (dark) ground. So the controls here are hand-styled against a new token set rather than the existing indigo components. To ship this for real, **update the design-system tokens** (see "Design tokens" below) and let the components read them — don't just restyle screens one-off.

## The aesthetic (from the landing page)
- **Ground:** warm cream (light) with a soft peach edge-glow at the top; warm near-black (dark). Not neutral gray.
- **Display type:** **Spectral** (serif) for the wordmark, page `<h1>`s, card titles, big survey names, and the "Question guide" heading. Weight 500, slight negative letter-spacing.
- **Body/UI type:** **Inter** for everything else (labels, table cells, helper text, buttons).
- **Primary buttons:** solid **charcoal** in light mode; inverted to **cream** in dark mode. Rounded 11px.
- **Status / accents:** muted **green** only for meaningful status (Live badge, "required" tag, eyebrows) — never for decoration.
- **Rail:** deep-charcoal icon rail is the constant anchor in both themes.
- Calmer, read-first layouts with real breathing room — the text-heavy forms (profile, survey detail) are broken into labeled cards.

## Screens
Rail order: **Home · Surveys · Company profile · Settings**. Survey detail is reached by clicking a survey row (Surveys stays highlighted); a "‹ Surveys" back link returns.

1. **Home** — centered serif "Welcome to Birdsong" + 3 large action cards (Create survey, View dashboard, Company profile) with hover lift + chevron nudge.
2. **Surveys** — eyebrow + serif "Your surveys" + charcoal "New survey"; search input + All/Live segmented chips; rows in a bordered card (serif name, green Live badge, slug, responses, created). Live substring search on name. Rows clickable → detail.
3. **Survey detail** — header (serif name + Live badge + "Set to draft" / "Save"), response count, public-link bar + Copy, two-column grid (Survey identity + Respondent chips / Survey details), full-width Question guide with numbered items. (Content = the 7/14/26 P&R survey.)
4. **Company profile** — kept the "Edit with AI" card (restyled), then Company name, logo (Replace/Remove), What do you sell, Target ICP, Value proposition as clean labeled cards + Save. All existing fields retained.
5. **Settings** — **Appearance** card with a Light/Dark segmented toggle (the new feature), then Account (email + Sign out), Change email, Change password.

## Theming (important)
- Driven by a single `data-theme="light|dark"` attribute on the app root; every surface reads CSS custom properties, so one attribute swap re-skins everything.
- The Settings toggle writes `bs-theme` to `localStorage` and the app initializes from it. In the real app, back this with your theme context/provider and persist per-user.

## Design tokens (target values)
Light: bg `#f3ecdf`, surface `#fffdf7`, subtle fill `#f6efe1`, text `#262019`, muted `#6f6757`, faint `#a89d88`, border `#e7ddc9`, rail `#241f18`, button `#241f18`/text `#f3ecdf`, green bg `#e4ecdd`/text `#3a6046`, peach glow `rgba(233,166,116,.22)`.
Dark: bg `#161410`, surface `#221f19`, fill `#2a251e`, text `#efe6d6`, muted `#a89e8b`, faint `#726a5b`, border `#37302a`, rail `#100e0b`, button `#efe6d6`/text `#1a1712`, green bg `#233020`/text `#9ec9a4`.
Radius: 16px cards, 11px buttons/inputs, 9px small controls, 999px badges/chips. Fonts: Spectral (display), Inter (UI).

## Interactions
Rail navigation; live survey search; row → detail; theme toggle (persisted). Copy / Save / Send / Spruce-up / Sign out / Update are visual only here — wire to real handlers.

## Files
- `BirdsongAdmin.dc.html` — the design reference (design-tool template syntax; treat as a visual/behavioral spec).
- `ds-base.js`, `support.js` — runtime shims for previewing the reference; not part of the app.
