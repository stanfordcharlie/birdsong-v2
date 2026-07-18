# Handoff: Birdsong Admin Home (Welcome Screen)

## Overview
A redesigned admin landing/welcome screen for Birdsong (birdsong-v2.vercel.app/admin). Replaces the previous centered cream-and-serif layout with a split-screen editorial design: a dark greeting + activity panel on the left, and a numbered action list on the right.

## About the Design Files
The file in this bundle is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to copy directly. Recreate this design in the target codebase's existing environment (the Birdsong Next.js/React app on Vercel) using its established patterns and the birdsong-ui component library. The HTML file (`Birdsong Home v2.dc.html`) is the visual source of truth.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, copy, and animations are final. Recreate pixel-perfectly using the codebase's existing libraries and Tailwind tokens.

## Screens / Views

### Admin Home
- **Purpose**: Post-login landing for admin users — greet, surface recent activity, route to the three main destinations.
- **Layout**: Full-viewport horizontal flex split.
  - **Left panel**: 42% width (min-width 380px), background `#1c1917` (warm ink black), text `#f5f4ef` (warm cream). Vertical flex, `justify-content: space-between`, padding `48px 56px`. Three stacked groups: date label, greeting, activity feed.
  - **Right panel**: remaining width, background `#f8f8f7` (Birdsong `bg-page`). Vertically centered column, padding `64px 72px`.

#### Left panel components
1. **Date label** — "FRIDAY, JULY 17" (render current date dynamically): Archivo 12px / 600, letter-spacing 0.16em, uppercase, color `rgba(245,244,239,0.5)`, margin-bottom 20px.
2. **Greeting** — "Good afternoon, Casey." on three lines (time-of-day + user first name, dynamic): **Young Serif** 400, `clamp(44px, 4.6vw, 66px)`, line-height 1.06, letter-spacing -0.005em, color `#f5f4ef`.
3. **Activity feed ("What's been happening")**:
   - Section label: same style as date label, margin-bottom 18px, preceded by a 7px indigo-200 (`#a5b4fc`) dot that pulses (scale 1→1.4, opacity 1→0.6, 2s ease-in-out infinite).
   - 3 rows (most recent first), column gap 14px. Each row: flex, space-between, baseline-aligned; event text Archivo 14px/500 in cream with survey names highlighted `#a5b4fc`; relative timestamp Archivo 12px, `rgba(245,244,239,0.45)`, nowrap. Rows 1–2 have bottom hairline `1px solid rgba(245,244,239,0.12)` with 13px padding-bottom.
   - Sample copy: "6 new responses on *CivicRec renewal interview* — 12m ago", "2 leads qualified from *Parks & Rec onboarding* — 1h ago", "*Facility booking survey* hit its response goal — Yesterday". Feed should be data-driven (responses, qualified leads, goals reached).

#### Right panel components
1. **Section label** — "WHERE TO NEXT": Archivo 12px/600, 0.16em tracking, uppercase, `#a8a29e`, margin-bottom 8px.
2. **Action rows** (3): flex rows, gap 28px, padding `34px 20px`, border-radius 12px, hairline divider `1px solid #e7e5e4` between rows (not after last), cursor pointer.
   - Index number ("01"/"02"/"03"): Archivo 13px/600, `#a8a29e`, min-width 26px.
   - Title: Archivo 23px/600, `#1c1917`, letter-spacing -0.01em, margin-bottom 6px.
   - Description: Archivo 15px/400, `#78716c`.
   - Right arrow icon: 22px stroke icon (line + chevron), stroke `#1c1917`, stroke-width 1.8.
   - Rows: "Create a new survey / Build and launch an AI-moderated interview" → survey builder; "View dashboard / See your surveys, responses, and leads" → dashboard; "Company profile / Set your ICP, brand voice, and survey defaults" → profile settings.

## Interactions & Behavior
- **Action row hover**: background `rgba(28,25,23,0.04)`, transition `background 0.15s ease`.
- **Load-in animation** (one-shot on mount, all use `animation-fill-mode: both`):
  - `bs-rise`: opacity 0→1, translateY(16px)→0, ease-out. Greeting block 0.7s @ 0.35s delay; activity feed 0.7s @ 0.55s; right label 0.6s @ 0.5s; action rows 0.6s staggered @ 0.6s / 0.7s / 0.8s.
  - Pulsing indigo dot on the activity label (see above).
  - (A bird-glyph stroke-draw animation — `stroke-dasharray: 60`, dashoffset 60→0, 1.2s ease-out — exists in the file's keyframes and can be reused if the brand bird appears elsewhere on load, e.g. matching the landing page.)
- Each action row navigates on click (whole row is the hit target).

## State Management
- Current user (first name) and time-of-day for the greeting (morning/afternoon/evening).
- Current date for the date label.
- Activity feed: fetch recent events (new responses, qualified leads, goal completions) with relative timestamps; cap at 3.

## Design Tokens
- Colors: ink `#1c1917` (stone-900), cream `#f5f4ef`, page `#f8f8f7` (bg-page), divider light `#e7e5e4`, muted text `#78716c`, faint text `#a8a29e`, highlight indigo-200 `#a5b4fc`; cream alphas 0.5 / 0.45 / 0.12 on the dark panel.
- Typography: **Young Serif** (400) — display greeting only; **Archivo** (400/500/600) — everything else. Both on Google Fonts.
- Type scale: display clamp(44–66px); row title 23px; body 14–15px; timestamps/index 12–13px; labels 12px uppercase 0.16em tracking.
- Radius: 12px on hoverable rows (matches `rounded-card`).
- Spacing: panel padding 48/56px (left), 64/72px (right); row padding 34px vertical.

## Assets
- No raster assets. Arrow icons are inline SVG strokes (Feather-style). Optional bird glyph is an inline SVG path (in the design file).

## Files
- `Birdsong Home v2.dc.html` — the full design reference (open in a browser; it loads the birdsong-ui bundle from the project's `_ds/` folder — visuals are all inline styles, so the file reads standalone).
