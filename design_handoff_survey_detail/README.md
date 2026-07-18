# Handoff: Survey Detail (survey config / read view)

## Overview
Read-first survey detail/config page: app shell (icon rail + main content), survey header with status badge and public link, identity + respondent-fields panels, survey details panel, and a question guide list.

## About the Design Files
The file in this bundle (`SurveyDetail.dc.html`) is a **design reference built in HTML** against the Birdsong design system's component bundle — a prototype showing intended look and behavior, not production code to copy directly. Recreate this UI in the target codebase's existing environment (React app consuming `birdsong-ui`) using its established patterns — reuse the real `birdsong-ui` components (`Button`, `Badge`) rather than the HTML markup verbatim.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and component choices are final. Recreate pixel-close using the real `birdsong-ui` React components and design tokens (not raw hex values where a token/utility class exists).

## Screens / Views

### Survey detail ("7/14/26 P&R")
**Purpose:** Review a survey's configuration at a glance — identity, public link, respondent data collected, targeting/tone, and the generated question guide — and save edits.

**Layout:** Two-column app shell, `100vh`, `display:flex` (same rail as the survey list screen).
- Left rail: `72px` fixed width, dark background (`oklch(0.19 0.004 285)`), same nav as list page, "Surveys" item active.
- Main: `flex:1`, scrollable, `48px 56px 80px` padding, background `#f8f8f7`.

**Components:**
- **Header row** — `<h1>` survey internal name (26px, weight 600, `-0.01em` letter-spacing) + `Badge` (variant `success`, "Live") inline; "Save" primary `Button` top-right. Below: muted 13px response count ("1 response").
- **Public link bar** — white card, `1px solid #eaeae7`, `10px` radius, `8px 8px 8px 16px` padding: full survey URL (13px, `#71716b`, truncated with ellipsis) + secondary "Copy" button (sm).
- **Two-column grid** (`340px 1fr`, `24px` gap):
  - Left column: **"Survey identity"** card (internal name, external name, slug as label/value rows) and **"Respondent info collected"** card — pill chips per field, indigo-tinted `chip-required` (bg `#eef2ff`, text `#4f46e5`, border `#e0e4fb`) with small "required" tag vs. neutral `chip-optional` (bg `#f7f7f5`, text `#71716b`, border `#eaeae7`); footnote "Name and email always collected."
  - Right column: **"Survey details"** card — Topic (paragraph), Target audience (single line, middot-separated segments), and a Tone / Questions-count pair.
- **Question guide card** (full width, below grid) — "Question guide" `<h2>` (18px/600) + secondary "Spruce up with AI" button; numbered list of 6 questions, each a 28×28 rounded-8px number badge (`#f1f1ef` bg, `#71716b` text) + question text (15px/1.6 line-height, `#2a2a27`).

**Content used:**
- Survey: "7/14/26 P&R" (internal) / "Parks and Rec" (external), slug `parks-and-rec-2`, status Live, 1 response.
- URL: `https://birdsong-v2.vercel.app/survey/parks-and-rec-2`
- Respondent fields: Phone number (required), Job title (required), Company name (required), LinkedIn URL (optional).
- Topic: understand Parks and Rec software satisfaction to identify pain points and sell Rec's product.
- Target audience: "Parks and Recreation · Directors and Managers · $1M+ revenue". Tone: Conversational. Questions: 6.
- 6-question guide covering current software stack/tenure, switching triggers, daily frustrations, purchasing stakeholders/budget cycle, appetite for online registration/payments, and switching criteria.

## Interactions & Behavior
- Field rows in "Survey identity" reveal an edit hint on hover (`.field-row:hover .edit-hint`) — implies inline-editable fields on click, not built out in this prototype.
- "Copy" button next to the public URL — should copy the link to clipboard.
- "Save" button — persists any edits made on the page.
- "Spruce up with AI" — secondary action to regenerate/improve the question guide via AI; not wired in this prototype.
- Chips are static/display-only here; in the real app they likely reflect a respondent-fields config that could be edited elsewhere.

## State Management
- `respondentFields: {label, required}[]` — drives the chip list and required/optional styling.
- `questions: {num, text}[]` — drives the numbered question list.
- No client-side state transitions are wired in this prototype (Save/Copy/AI button are visual only).

## Design Tokens
- Font: Inter (all text).
- Colors: page bg `#f8f8f7`, card bg white, border `#eaeae7`, primary/indigo accent `#4f46e5` (chip-required bg `#eef2ff`/border `#e0e4fb`), muted text `#9c9c98`, secondary text `#71716b`/`#3f3f3a`/`#2a2a27`, sidebar `oklch(0.19 0.004 285)`, success green `oklch(0.6 0.14 145)` (avatar), chip-optional bg `#f7f7f5`.
- Radius: 12px (cards), 10px (link bar, nav icons), 9px/8px (logo mark/avatar/question number badge), 20px (chips).
- Use the real `birdsong-ui` semantic tokens/classes instead of hardcoded hex/px where the token system already covers the value — the hex/px values above are the visual targets, not literal implementation values.

## Assets
No images. Icons are simple inline SVGs (strokes only) — recreate with the codebase's icon set/library if one exists, matching the simple line style shown.

## Files
- `SurveyDetail.dc.html` — the design reference (HTML + inline React-ish template syntax specific to this design tool; treat as a visual/behavioral spec, not literal code to port).
