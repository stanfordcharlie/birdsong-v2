# Handoff: Company Profile Page

## Overview
A redesigned "Company Profile" settings page for an admin dashboard (Birdsong survey product). Lets a company admin view/edit their sales profile (name, logo, product description, ICP, value prop, brand voice) that the product uses to brief its AI survey interviewer. Replaces a prior version that was one long, undifferentiated column of full-width text fields.

## About the Design Files
The bundled file (`CompanyProfile.dc.html`) is a **design reference built in HTML** — a working prototype showing intended look, layout, and interaction, not production code to copy directly. The task is to recreate this design in the target codebase's existing environment (React, Vue, etc.) using its established component library and patterns. This project is built against the "Birdsong" design system (Tailwind + a custom token/radius scale); if the target codebase already has Birdsong's component library, use its real components (Card, Button, Input, Textarea, Badge) instead of the hand-styled markup in the prototype.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions here are final — recreate pixel-for-pixel using the codebase's existing design system components.

## Screens / Views

### Company Profile (single screen)
**Purpose:** View and edit the company's sales profile; ask an AI assistant to make edits in natural language.

**Layout:**
- Two-column app shell: fixed 74px-wide dark icon rail on the left (Home, Surveys, Company profile [active], Settings, nav icons + avatar), flexible main content area on the right with a warm radial-gradient background.
- Main content is a single centered column, `max-width: 800px`, `padding: 44px 56px 100px`.
- Sticky header at the top of the scroll area (eyebrow label "COMPANY PROFILE" in uppercase 13px, then serif H1 "Company profile" at 38px) with a right-aligned action cluster: status label text, Reset button (ghost), Save changes button (primary). Header background fades via a gradient so content scrolling behind it doesn't look cut off.
- Below the header: a single-row "Edit with AI" bar — a tinted card (13px radius) containing a small sparkle icon, a borderless inline text input with placeholder copy, and a compact primary button. This replaced a much larger instructional card in the earlier version.
- Below that: a vertical stack (22px gap) of section cards, each `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 16px`, `padding: 24px 26px`. Each card has: an uppercase 12px eyebrow (e.g. "BASICS", "PRODUCT", "AUDIENCE", "POSITIONING", "VOICE"), a serif 20px section title, a 13.5px muted description line, then the field(s).
  1. **Basics** — 2-column grid (Company name, Industry), 2-column grid (Website, Team size), then a Company logo row (52×52px avatar — image if set, else initials — plus Replace/Remove controls).
  2. **Product** — "What you sell" textarea (3 rows).
  3. **Audience** — "Target ICP" textarea (5 rows).
  4. **Positioning** — "Value proposition" textarea (4 rows).
  5. **Voice** — "Brand voice" — a row of pill/chip toggles: Conversational, Professional, Playful, Direct (single-select).

**Components:**
- **Text input** (`.field-input`): white/cream surface (#fffdf7), 1px border (#e7ddc9), 11px radius, 12px/15px padding, 14px Inter text, focus state darkens border to muted color (no outline).
- **Textarea** (`.field-textarea`): same visual treatment as input, 1.6 line-height, vertically resizable.
- **Ghost button** (`.ghost-btn`): transparent background, 1px border (#e7ddc9), 11px radius, 10px/18px padding, hover fills with `--surface2` (#f6efe1). Disabled state: 40% opacity, default cursor.
- **Primary button** (`.primary-btn`): solid dark fill (#241f18) with cream text (#f3ecdf), no border, 11px radius, weight 600. Disabled: 40% opacity.
- **Voice chip** (`.voice-chip`): pill-ish 9px radius, 1px border, transparent by default; selected state (`data-on="true"`) fills solid dark with cream text.
- **Logo avatar**: 52×52px, 12px radius, bordered; shows uploaded image (object-fit: cover) or a lowercase 3-letter initials fallback in serif type.

## Interactions & Behavior
- **Field edits** update local draft state immediately (controlled inputs).
- **Dirty tracking**: the draft is compared (deep JSON compare) against the last-saved snapshot. Header status label reads "Unsaved changes" vs "All changes saved" accordingly; Reset and Save changes are both disabled (40% opacity, no-op) when there are no unsaved changes.
- **Save changes**: persists the draft as the new saved snapshot (in the prototype, to `localStorage`; in production, to the backend). Clears dirty state.
- **Reset**: discards the draft and reverts all fields back to the last-saved values (not to factory defaults).
- **Company logo**:
  - "Replace" opens a native file picker (accepts images); on file selection it reads the file and displays it immediately in the avatar slot (in production: upload to storage, use the returned URL).
  - "Remove" clears the logo, reverting to the initials fallback.
- **Edit with AI bar**: single-line input + button. Enter key or button click triggers "send". Button shows "Applied ✓" for ~1.6s after sending, then resets to idle and clears the input. (In the prototype this is a stubbed/simulated response — no real model call. In production this should call the actual AI-edit endpoint and apply the returned diff to the relevant field(s), likely with a loading state and a way to review/undo the change before it's treated as "applied.")
- **Brand voice chips**: single-select; clicking a chip sets it as the active tone.
- No responsive/mobile behavior was designed — this is a desktop admin surface (built at ~1280px+ viewport widths).

## State Management
Suggested state shape:
```
{
  saved: { companyName, industry, website, teamSize, logoUrl, whatYouSell, targetICP, valueProp, brandVoice },
  draft: { ...same shape... },   // bound to form fields
  aiPrompt: string,
  aiStatus: "idle" | "sent"      // or "loading"/"error" once wired to a real backend
}
```
- `isDirty` = deep-compare `draft` vs `saved`.
- `handleSave` persists `draft` → backend, then sets `saved = draft`.
- `handleReset` sets `draft = saved`.
- Data fetching: on mount, load the saved profile from the backend (prototype falls back to hardcoded sample data — see Assets below — when nothing is persisted yet).

## Design Tokens
Color:
- `--bg: #f3ecdf` (page background)
- `--glow: rgba(233,166,116,.22)` (radial gradient accent behind content)
- `--surface: #fffdf7` (card/input background)
- `--surface2: #f6efe1` (hover fill, AI bar background)
- `--text: #262019` (primary text)
- `--muted: #6f6757` (secondary text)
- `--faint: #a89d88` (tertiary text/eyebrows, placeholders)
- `--border: #e7ddc9` (default border)
- `--rail: #241f18` (icon rail background)
- `--rail-txt: rgba(255,253,247,.66)` (rail icon color)
- `--rail-active: rgba(255,253,247,.14)` (rail active/hover fill)
- `--btn / --btn-txt: #241f18 / #f3ecdf` (primary button)
- `--green-bg / --green-txt: #e4ecdd / #3a6046` (brand mark, avatar accents)
- `--accent: #e9a674` (AI sparkle icon)

Typography:
- Serif (headings): Spectral, weights 400/500/600, italic 400 available. Used for H1 (38px/500), section titles (20px/500), logo initials.
- Sans (body/UI): Inter, weights 400–700. Body/labels 14px, field text 14px, eyebrows 12–13px uppercase with 0.04–0.05em letter-spacing, helper text 13–13.5px.

Radius: cards/AI bar 13–16px, buttons/inputs 9–11px, avatar 12px.

Shadows: none used — depth comes from 1px borders + subtle surface-color steps, consistent with the Birdsong editorial aesthetic (no drop shadows).

## Assets
No external image assets. Icons are inline SVG (nav glyphs, AI sparkle). Sample seed data (company "Rec Technologies", parks & recreation software copy) is placeholder content standing in for whatever company profile is actually loaded — replace with real data.

## Files
- `CompanyProfile.dc.html` — the full design reference (self-contained; open directly in a browser). Contains both markup and the interaction logic (vanilla component-style JS class) in one file, per this design tool's authoring format — treat the JS as a behavior spec, not as code to paste into the target codebase.
