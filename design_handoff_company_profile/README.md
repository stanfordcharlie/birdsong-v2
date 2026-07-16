# Handoff: Company Profile Setup Flow

## Overview
A redesigned multi-step "Company Profile" onboarding wizard (previously a single-question-per-page form with a plain progress bar). This version groups related fields to reduce total steps, isolates the two highest-impact questions (business description, target audience) on their own screens, adds a jumpable section list, autosave/resume, and a review step — all aimed at cutting fatigue across a multi-step flow.

## About the Design Files
The bundled file (`Company Profile.dc.html`) is a **design reference built in HTML** — a working prototype showing intended layout, copy, states, and interaction behavior. It is not production code to paste into the app. The task is to **recreate this design in the target codebase's existing environment** (React/Vue/whatever the admin app already uses) using its existing form components, state management, and API/persistence patterns. If the codebase has its own design system for buttons/inputs/cards, use those instead of the "Birdsong" library referenced in the prototype — Birdsong was only this project's visual placeholder system; treat its look (colors, radii, spacing) as the reference to match, not a library to install.

Open the `.dc.html` file directly in a browser to view/interact with it.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and copy below are final — recreate pixel-close. Layout measurements are inline styles in the file; treat those as the source of truth.

## Screens / Views

### Shared shell (present on every step)
- **Layout**: Full-height flex row. Left rail: fixed `220px` wide, white background (`#ffffff`), `1px solid #e6e6e4` right border, `32px 20px` padding, sticky/pinned full height. Right side: flex-1, content centered in a `max-width: 680px` column, `56px 40px` outer padding.
- **Left rail contents**:
  - Wordmark "Company Profile" — Source Serif 4, 500 weight, 17px, `#1a1a18`, `-0.01em` letter-spacing.
  - Vertical step list (see Step Navigator below).
  - Bottom-pinned autosave note (`margin-top: auto`), 12px, `#b3b3ac` — reads "Autosaved as you go" by default, or "Saved just now — resume anytime" for ~3s after clicking Save & exit.
- **Top bar** (right column, above the card): left-aligned breadcrumb text "Step X of 7 · {Section}" (14px, `#9a9a94`); right-aligned "Save & exit" secondary button.
- **Progress bar**: full-width track, `4px` tall, `#ececea` background, `999px` radius; filled portion `#6366f1` (indigo), width = `(step index + 1) / 7 * 100%`, animates via `width 320ms ease`.
- **Card**: white, `1px solid #e6e6e4` border, `16px` radius, `44px` padding, `min-height: 540px`, flex column with the footer pinned to the bottom via `margin-top: auto` — this keeps the Back/Continue buttons in the exact same on-screen position across every step regardless of content length (a deliberate fix so users don't have to move their cursor).
- **Step transition**: on navigating steps, the whole card fades/slides in — `opacity 0→1`, `translateY(8px→0)`, `260ms ease`.

### Step Navigator (left rail list)
One row per step: a circle + connecting vertical line + label.
- **Current step**: circle filled `#6366f1`, white number, label `#1a1a18` weight 600.
- **Completed step**: circle `#e9f9ef` bg, `1px solid #86e0a6`, green `✓` (`#15803d`); label `#79796f` weight 500.
- **Upcoming step**: circle white, `1px solid #e6e6e4`, gray number (`#9a9a94`); label `#9a9a94` weight 500.
- Circle: 26×26px, fully rounded, 12px/600 weight text.
- Rows are click-to-jump — clicking any step (including ahead of current) navigates directly there (flow explicitly allows skip-around / save-and-resume).

### Step 1 — Basics (grouped fields)
- Eyebrow: "BASICS" — 13px, 600 weight, uppercase, `0.03em` tracking, `#8b7cf6`.
- Title: "Let's start with the essentials" — Source Serif 4, 28px, 500 weight, `#1a1a18`, `-0.01em` tracking.
- Subtitle: "The basics we'll use across your workspace and in generated copy." — 15.5px, `#79796f`, 1.6 line-height.
- Fields (grid, `repeat(auto-fit, minmax(220px,1fr))`, 20px gap):
  - Company name (text, required) — placeholder "Acme Robotics"; helper text below: "Shown internally and used in generated copy."
  - Industry (text) — placeholder "e.g. Logistics software"
  - Team size (text) — placeholder "e.g. 25 employees"

### Step 2 — Web presence (grouped)
- Title: "Where can people find you online?" Subtitle: "Optional, but it helps us pull in the right context."
- Fields: Website (placeholder "https://acme.com"), LinkedIn (placeholder "linkedin.com/company/acme").

### Step 3 — What you do (isolated, high-impact)
- Title: "In your own words, what does your company do?" Subtitle: "A couple of sentences is plenty — this shapes every piece of generated copy."
- Single full-width Textarea (6 rows, no field label — the title serves as the label), placeholder "We help mid-size logistics teams cut fuel costs with route-planning software...", helper text below: "Write like you would to a new hire on day one."
- Fields container here is a single-column flex (not grid) since it's one large field.

### Step 4 — Audience (isolated, high-impact)
- Title: "Who are you trying to reach?" Subtitle: "Describe your ideal customer — their role, company type, or pain points."
- Single full-width Textarea (6 rows), placeholder "Operations managers at 50-500 person distribution companies frustrated with manual scheduling..."

### Step 5 — Brand voice (grouped)
- Title: "How should we sound?" Subtitle: "A few words go a long way in keeping generated copy on-brand."
- Fields: Tone (text, placeholder "e.g. Friendly, confident, no jargon"); Words/phrases to avoid (textarea, 3 rows, placeholder example with quoted words).

### Step 6 — Contact (grouped)
- Title: "Who should we reach out to?" Subtitle: "For account updates and anything that needs a human."
- Fields: Contact name (placeholder "Jordan Lee"), Contact email (placeholder "jordan@acme.com").

### Step 7 — Review
- Title: "Everything look right?" Subtitle: "Jump back into any section to make changes."
- One card per prior section (`1px solid #e6e6e4`, `12px` radius, `18px 20px` padding): section name (13px/600/`#1a1a18`) + small "Edit" secondary button that jumps straight to that step; below, each field shown as "`Label`: value" (label in `#9a9a94`, value in `#4a4a44`), or an em dash if empty.
- Footer: "Back" secondary button (left) + "Finish setup" primary button (right).

## Typography
- **Headings** (all step titles + the sidebar wordmark): Source Serif 4 (Google Font, weights 400/500/600), falls back to Georgia/serif. This pairing — serif headlines over a sans UI — is the intentional "friendlier, conversational" direction requested, similar to how Claude/Anthropic's product pairs a serif display face with a sans interface.
- **Everything else** (body copy, labels, buttons, inputs, nav): Inter, sans-serif. Note: form controls (`button`, `input`, `textarea`, `select`) need an explicit `font-family: inherit` reset — browsers otherwise apply their own default (observed bug: buttons fell back to Times because nothing forced them to inherit the page font).

## Interactions & Behavior
- **Continue button**: disabled until the step's required field(s) are filled (Company name on step 1; the description/audience textareas on steps 3–4). Label reads "Continue" normally, "Review" on the last input step (step 6→7), "Finish setup" on the review step.
- **Back button**: hidden on step 1 only.
- **Any sidebar step is clickable at any time** — jumps directly there (no forced linear order), matching the "users can skip or leave and come back" requirement.
- **Autosave**: every field edit persists the full form state + current step index to `localStorage` immediately (key `birdsong-company-profile-draft-v1` in the prototype — rename per app). On load, restore from storage if present.
- **Save & exit button**: shows a transient confirmation ("Saved just now — resume anytime") in the sidebar for ~3 seconds, then reverts to the default "Autosaved as you go" copy. In the real app this should also be the actual exit/navigate-away action.
- **Step transition animation**: 260ms fade + 8px vertical slide-in on every step change (including sidebar-driven jumps).

## State Management
- `step`: current step index (0–6).
- `data`: flat key/value map of all field values across all steps (keys: `companyName, industry, teamSize, website, linkedin, description, audience, tone, avoid, contactName, contactEmail`).
- `entering`: transient boolean driving the step-transition animation.
- `saveNote`: transient string for the autosave confirmation message.
- Real implementation should replace localStorage persistence with the app's actual profile-save API, ideally debounced per field, plus a real "resume" entry point (e.g. redirect to last incomplete step on return).

## Design Tokens
- Indigo primary: `#6366f1` (buttons, current-step circle, progress fill)
- Border: `#e6e6e4`
- Page background: `#f8f8f7`
- Card/surface: `#ffffff`
- Text primary: `#1a1a18`
- Text muted: `#79796f` (subtitles), `#9a9a94` (labels/breadcrumbs/helper text), `#b3b3ac` (autosave note)
- Success (completed step): bg `#e9f9ef`, border `#86e0a6`, icon/text `#15803d`
- Eyebrow accent: `#8b7cf6`
- Radii: `8px` (buttons/inputs), `12px` (review cards), `16px` (main card), `999px` (pills/progress track)
- Card padding: `44px`; page padding: `56px 40px`; sidebar padding: `32px 20px`

## Assets
No images/icons — the only glyph used is a plain checkmark (✓) character for completed steps. No external assets to source.

## Files
- `Company Profile.dc.html` — the full prototype (structure, inline styles, and step/state logic in the trailing `<script>` block).
