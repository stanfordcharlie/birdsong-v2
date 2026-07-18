# Handoff: Survey Admin (surveys list page)

## Overview
Admin dashboard screen listing a user's surveys: app shell (icon rail + main content), search/filter bar, and a data table (name, status, slug, response count, created date).

## About the Design Files
The file in this bundle (`SurveyAdmin.dc.html`) is a **design reference built in HTML** against the Birdsong design system's component bundle — it is a prototype showing intended look and behavior, not production code to copy directly. Recreate this UI in the target codebase's existing environment (React app consuming `birdsong-ui`) using its established patterns — reuse the real `birdsong-ui` components (`Button`, `Input`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Badge`) rather than the HTML markup verbatim.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and component choices are final. Recreate pixel-close using the real `birdsong-ui` React components and design tokens (not raw hex values where a token/utility class exists).

## Screens / Views

### Survey list ("Your Surveys")
**Purpose:** Browse, search, and filter surveys; jump into one or create a new one.

**Layout:** Two-column app shell, `100vh`, `display:flex`.
- Left rail: `72px` fixed width, dark background (`oklch(0.19 0.004 285)`), vertical flex, `20px 0` padding, `28px` gap between logo mark and nav group.
- Main: `flex:1`, scrollable, `48px 56px` padding, background `#f8f8f7`.

**Components:**
- **Icon rail** — 32×32 logo mark (rounded 9px square, indigo `oklch(0.58 0.19 265)`, white ring icon) at top; 4 nav icons (Home, Surveys — active, Respondents, Settings) as 40×40 rounded-10px hit targets, icons drawn in plain SVG strokes at `rgba(255,255,255,.72)` (active one white); active item background `rgba(255,255,255,.12)`; hover `rgba(255,255,255,.08)`. User avatar (30×30, rounded 8px, green `oklch(0.6 0.14 145)`, initial "S") pinned to bottom via `flex:1` spacer.
- **Header row** — small label "Surveys" (13px, `#9c9c98`, weight 500) above `<h1>` "Your Surveys" (28px, weight 600, `-0.01em` letter-spacing). "New survey" button, primary variant, top-right.
- **Search + filters** — `Input` (max-width 320px, placeholder "Search surveys") + two filter chips ("All" active/dark, "Live" inactive/outline), 8px radius, 13px/500 weight.
- **Table** — single `birdsong-ui` `Table` (one `<table>`, not split header/body tables — keeping header and body in the same table element is required for column alignment). Columns: Internal name (indigo link text, weight 500), Status (`Badge` — `success` variant for Live, `warning` for Draft), Slug (Inter, 13px, `#71716b` — same font as the rest of the row, not monospace), Responses (`#3f3f3a`), Created (13px, `#9c9c98`). Row hover background `#f1f1ef`. Container: white background, `1px solid #eaeae7` border, `12px` radius, `overflow:hidden`.

**Content used:**
- Customer Feedback Habits — customer-feedback-habits — Live — 128 — Jul 1, 2026
- Renewal Interview — renewal-interview-2026 — Live — 64 — Jun 28, 2026
- Onboarding Pulse Check — onboarding-pulse-check — Draft — 0 — Jun 20, 2026

## Interactions & Behavior
- Search input filters the `surveys` list by case-insensitive substring match on name (client-side, live-typing).
- "All"/"Live" filter chips are visual only in this prototype — wire up real filtering by status in the app.
- Survey name is a clickable link (indigo, pointer cursor) — should navigate to the survey detail/editor.
- "New survey" button — primary action, should open the survey-creation flow.
- Row hover state on every table row.

## State Management
- `query: string` — current search text, updates on input change, filters the list.
- Status filter ("All"/"Live") is not yet wired to state in the prototype — needs a `statusFilter` state value and corresponding filter logic if implemented.

## Design Tokens
- Font: Inter (all text, including the slug column — do not use a monospace font for slugs).
- Colors: page bg `#f8f8f7`, card/table bg `white`, border `#eaeae7`/`#e5e5e2`, primary/link `#4f46e5` (indigo — matches Birdsong's `bg-primary` token), muted text `#9c9c98`, secondary text `#71716b`/`#3f3f3a`, sidebar `oklch(0.19 0.004 285)`, success green `oklch(0.6 0.14 145)`.
- Radius: 12px (containers/table), 10px (nav icons), 9px/8px (logo mark/avatar), 8px (chips/inputs).
- Use the real `birdsong-ui` semantic tokens/classes (`bg-primary`, `text-muted-foreground`, `rounded-card`, `rounded-control`, etc.) instead of hardcoded hex/px where the token system already covers the value — the hex/px values above are the visual targets, not literal implementation values.

## Assets
No images. Icons are simple inline SVGs (strokes only) — recreate with the codebase's icon set/library if one exists, matching the simple line style shown.

## Files
- `SurveyAdmin.dc.html` — the design reference (HTML + inline React-ish template syntax specific to this design tool; treat as a visual/behavioral spec, not literal code to port).
