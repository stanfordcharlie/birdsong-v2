# Handoff: Birdsong Marketing Landing Page

## Overview
A single-page marketing site for **Birdsong**, a product that recruits a company's target audience into paid, AI-moderated conversations that feel like genuine industry research, then extracts pain points, scores respondents as sales leads, and routes qualified leads (with the full conversation context) to the buyer's sales team.

One-sentence pitch used on the page: *"Birdsong hands you better inbound leads, with all the context already there."*

The page: nav → hero with self-playing product demo → "How it works" (Invite / Converse / Deliver) → feature grid → footer CTA.

## About the Design Files
The file in this bundle (`BirdSong Landing.dc.html`) is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to copy directly. The task is to **recreate this design as a production site** (recommended for Vercel: a Next.js or plain React + Vite app) using standard React components, CSS (or Tailwind), and the self-playing demo re-implemented as a React state machine as described below.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and animation timings are final. Recreate pixel-perfectly.

## Positioning constraints (important — copy must not drift)
- The motion is **outbound**: the company reaches its target audience directly and invites them into paid conversations. Never imply passive/on-site origin.
- Birdsong is **NOT**: a live-chat widget, passive intent/firmographic tracking, a quiz funnel, or a form. The demo must read as a session someone was invited into and actively joined.
- The word "inbound" is kept only as lead-quality language (e.g. "Better inbound leads within the week"), never as the acquisition mechanic.
- **No em dashes anywhere in copy.** No purple anywhere in the palette.

## Design Tokens
Colors:
- Paper (page bg): `#F5EFE3`; hero radial highlight: `#FBF7ED` (radial-gradient 1200px×600px at 50% -10%, fading to paper at 60%)
- Ink (text, buttons, bird): `#211D16`; ink hover: `#3A342A`
- Muted text: `#5D5748`; faint muted: `#8A8271`
- Pine green accent: `#33684B` (links hover, eyebrow, music notes, ripples, score bar, session chip text)
- Sage tint: `#E9EFE6` with border `#D3DECF` (respondent chat bubbles, session status chip)
- Deep green footer: `#1F3D2C`; footer text: `#F5EFE3` (65% / 45% alpha for secondary)
- Demo window surface: `#FDFDFC`; in-app neutrals: text `#1a1a1a`, secondary `#6b7280`, chips `#f4f4f5` border `#e4e4e7`
- Success (booked row): text `#16a34a`/`#15803d`, bg `#f0fdf4`, border `#bbf7d0`
- Hairlines: `rgba(33,29,22,.14)` (borders), `.08` (inner dividers), `.25` (section top rules)

Typography:
- Display: **Newsreader** (Google Fonts, weight 500, optical sizing), letter-spacing -0.02em on large sizes
- Body/UI: **Inter**, system-ui fallback
- Hero H1: clamp(42px, 6.4vw, 74px), line-height 1.04; section H2: clamp(30px, 3.6vw, 44px); card H3: 21–24px Newsreader 500
- Body: 15px/1.65 muted; hero subhead 19px/1.6

Radius: 12px cards/windows, 8px buttons/chips/inputs, 999px pills.
Shadow (demo window): `0 24px 60px -24px rgba(33,29,22,.28)`.
Max content width: 1120px (nav/sections), 880px (hero), 760px (demo).

## Screens / Views (single page)

### Nav
Flex row, space-between, 26px/32px padding, max-width 1120px centered.
- Left: bird logo mark (ink SVG, 26px) + "Birdsong" wordmark, Newsreader 21px/500.
- Right: links "How it works", "Features" (14px, muted, hover green) + "Get started" ink pill button (`#211D16` bg, paper text, 9px 18px, radius 8).

### Hero
Centered, max-width 880px, padding 72px 32px 24px.
- H1: **"Your best leads are already singing."** (text-wrap: balance)
- Subhead: **"Birdsong invites the people you want to sell to into genuine conversations about their work, then hands your team qualified leads with the whole story already there."** (max-width 560px)
- Buttons: primary ink "Get started" (13px 26px), secondary outlined "See how it works" (1px `rgba(33,29,22,.2)` border, hover full-ink border).
- Load animation: staggered fadeUp (translateY(14px)→0 + opacity, .8s ease, delays 0/.12s/.22s/.34s for h1/sub/buttons/demo).

### Self-playing product demo (hero centerpiece)
A 760px-max window card (`#FDFDFC`, 12px radius, hairline border, big soft shadow) with faux window chrome: three 9px dots + label "Birdsong" (12.5px, `#8A8271`). Body padding 22px 24px, min-height 300px.

**Bird detail:** an ink bird SVG (~40px) perched on the window's top edge (absolute, top -34px, left 72px), gently head-bobbing (keyframes: rotate 0 → -7deg at 30% → 4deg at 60% → 0, 5s ease-in-out infinite, transform-origin 60% 80%). Three green music notes (♪ ♫ ♪, Newsreader, 12–15px, `#33684B`) float up from its beak: keyframes translate(0,0) rotate(-4deg) opacity 0 → opacity 1 at 20% → translate(14px,-34px) rotate(10deg) opacity 0, 3.2s ease-out infinite, delays 0/1.1s/2.2s.

The demo is a looping state machine with 10 phases (durations in ms, divide by a speed multiplier):

| # | Phase | Dur | What shows |
|---|-------|-----|------------|
| 0 | joining | 1700 | Session view: header + green pulsing dot + "Maya accepted your invite · joining the session…" |
| 1 | question | 1700 | AI bubble (left, bird avatar 26px ink circle): "What part of your inbound process eats the most time for your team?" |
| 2 | typing | 1200 | Right-aligned sage bubble with 3 blinking dots |
| 3 | answer | 2800 | Right sage bubble: "Honestly? Qualifying. Our SDRs spend half the day on leads that go nowhere, and the good ones wait two days for a reply." |
| 4 | done | 1500 | Centered note: "Conversation complete · 19 min"; status chip → "Complete" |
| 5 | delivered | 1500 | View swaps to team view (see below); score bar at 12%, badge "Scoring" |
| 6 | qualified | 1300 | Score animates 12%→91% (width transition 1.1s cubic-bezier(.2,.7,.2,1)), label "91, strong", badge → green "Qualified" |
| 7 | cta | 1100 | Primary button "Book demo" appears |
| 8 | booked | 3400 | Button replaced by success row: "✓ Demo booked: Thursday 10:30 AM with Sam (AE, West)" |
| 9 | hold | 900 | Then loop to 0 |

**Session view** (phases 0–4): header row "Industry conversation" (15px/600) + "Go-to-market in mid-market SaaS · 20 min · paid session" (12.5px muted), hairline bottom border; right status pill (11.5px/600 green text on sage): "Invited" → "Question 4 of 8" → "Complete". Chat area min-height 150px. AI bubbles: `#f4f4f5`, radius 12/12/12/4. Respondent bubbles: sage `#E9EFE6` + `#D3DECF` border, radius 12/12/4/12, align right, max-width ~78%.

**Team view** (phases 5+), fades in: caps label "DELIVERED TO YOUR TEAM" (11px, .09em tracking, `#8A8271`); lead row: 38px avatar circle "MC" (`#EEEAE0`), "Maya Chen" 15px/600 + "Head of Growth · Coretide" 13px muted; badge right ("Scoring" neutral → "Qualified" success pill). Line "Conversation complete · 8 questions · 19 min". Then caps label "FROM THE CONVERSATION" + chip: "Pain point: slow inbound follow-up is costing deals". Then "Lead score" bar (6px track `#f4f4f5`, green `#33684B` fill, 999px radius). Every newly mounted element animates fadeUp .35–.45s.

### How it works
Full-width band tinted with `linear-gradient(180deg, rgba(51,104,75,0) 0%, rgba(51,104,75,.08) 22%, rgba(51,104,75,.08) 100%)`, margin-top 110px. Inner section max-width 1120px, padding 90px 32px.
- Eyebrow: "HOW IT WORKS" (13px, .14em tracking, uppercase, green)
- H2: "From first note to booked demo."
- 3 columns (grid, auto-fit minmax(280px,1fr), 48px gap), each with a 1px ink top rule (.25 alpha), a 120px animation area, Newsreader H3, and 15px body:
  1. **Invite** — "You pick the audience. Birdsong reaches them directly and invites them into a paid, peer-level conversation about their work." Animation: 3 expanding green ripple rings (scale .4→1.6, opacity .7→0, 2.8s infinite, delays 0/1s/2s) around a 10px ink dot.
  2. **Converse** — "A real conversation about their work, not a survey. What actually hurts surfaces in their own words, weighed against your ICP and scored." Animation: 3 chips cycling in/out (chipCycle keyframes: hidden → visible 16–78% → fade up out, 6s infinite, delays 0/1s/2s): "Pain: manual inbound triage", "Timeline: this quarter", "Champion: Head of Growth".
  3. **Deliver** — "The lead lands qualified and routed to the right rep, with the conversation attached and a demo ready to book." Animation: mini lead card ("Coretide" / "Qualified · routed to Sam" + green "92 fit" pill) floating ±7px, 6s ease-in-out infinite.

### Features
Max-width 1120px, padding 110px 32px 60px.
- H2: "Everything your team needs. Nothing it doesn't." (max-width 620px)
- 2×2 grid with 1px hairline dividers (grid gap 1px, divider-color background `rgba(33,29,22,.14)`, cells paper bg, `repeat(auto-fit, minmax(min(100%, 420px), 1fr))` so it collapses to 1 column on narrow). Cells padded 32px 28px:
  1. **Context, attached** — "Every lead arrives with the conversation: what hurts, who is involved, when they want to move."
  2. **Scoring you define** — "Fit is measured against your ICP, in criteria you can read. Not a black-box number."
  3. **Routing that holds** — "Territory, segment, round-robin. The right rep gets the lead the first time."
  4. **Booking built in** — ""Get started" becomes "demo booked" while the intent is still warm."

### Footer CTA
Full-width `#1F3D2C`, margin-top 90px. Centered inner (max 880px, padding 110px 32px 90px):
- Green ♪ glyph (Newsreader 22px)
- H2: "Hear your best leads first." (clamp(34px, 4.6vw, 56px), paper text)
- Sub: "Set up in an afternoon. Better inbound leads within the week." (16px, 65% paper)
- Button: paper bg, ink text, 14px 30px, radius 8, "Get started" (hover `#FFFDF7`)
- Bottom row (max 1120px, 13px, 45% paper): "© 2026 Birdsong" left; "How it works" / "Features" links right.

## Interactions & Behavior
- All CTAs are anchor scrolls in the prototype (`#cta`, `#how`, `#top`); in production, "Get started" should open the demo-booking flow (the funnel is get started → demo booked).
- Link hover: green `#33684B`. Ink buttons hover `#3A342A`. Outlined button hover: border → full ink.
- Demo loop: implement as a `phase` index + per-phase duration table (see above) with `setTimeout`; multiply durations by 1/speed. On unmount, clear the timer.
- Reduced motion: honor `prefers-reduced-motion` — jump the demo to phase 8 (final booked state) and stop; disable the entrance/float/ripple animations.
- Keyframes used: `fadeUp`, `noteFloat`, `ripple`, `chipCycle`, `floatCard` (±7px float), `blinkDot` (opacity .25↔1), `headBob`.
- Responsive: grids collapse via auto-fit minmax; hero type via clamp(); no horizontal overflow at 360px.

## State Management
Single piece of state: `phase: number` (0–9). Derived booleans: `sessionOn (p≤4)`, `joining (p=0)`, `qOn (1≤p≤4)`, `typing (p=2)`, `aOn (3≤p≤4)`, `doneOn (p=4)`, `teamOn (p≥5)`, `qualified (p≥6)`, `ctaOn (p≥7)`, `booked (p≥8)`. No data fetching.

## Assets
- Bird mark: simple ink SVG (round body, paper eye dot, green beak stroke) — two sizes (26px nav, 40px perched); paths are in the design file. Recreate or export as a proper logo asset.
- Music notes are text glyphs (♪ ♫) in Newsreader, not images.
- Fonts: Newsreader (Google Fonts), Inter (self-host or Google Fonts).
- Note: the prototype's demo uses Badge/Button components from an internal "Birdsong" UI kit (indigo primary button for "Book demo", green success badge); in production, style equivalents to match: primary button indigo `#4f46e5` is acceptable inside the product UI mock only — everything outside the demo window stays paper/ink/green.

## Files
- `BirdSong Landing.dc.html` — the full design reference (template markup + a `Component` logic class driving the demo phases). Styles are inline on elements; keyframes and body resets are in the `<style>` block near the top.
