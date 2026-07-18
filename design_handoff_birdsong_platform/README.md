# Handoff: Birdsong Platform UI (Admin Home, Company Profile, Survey Settings, Respondent Survey)

## Overview
A unified redesign of the Birdsong platform (birdsong-v2.vercel.app) in a single design language: ink-black panels, warm neutrals, Young Serif display type, Archivo UI type, indigo-200 accents. Four screens: admin home, company profile, survey settings/detail, and the end-user (respondent) interview experience.

## About the Design Files
These files are **design references created in HTML** — prototypes showing intended look and behavior, not production code. Recreate them in the target codebase's existing environment (Next.js/React + Tailwind + birdsong-ui) using its established patterns. Open each HTML file in a browser to see exact rendering; all visual styling is inline, so files read standalone.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, copy, and animations are final. Content (survey names, questions, stats) is realistic sample data — wire to real data.

## Shared Design Language (applies to every screen)
- **Fonts** (Google Fonts): **Young Serif** 400 — display headings, big numbers, wordmark ONLY. **Archivo** 400/500/600 — all other text. No other fonts anywhere.
- **Colors**: ink `#1c1917` (dark surfaces, primary text, primary buttons), cream `#f5f4ef` (text on ink), page `#f8f8f7`, card white `#ffffff`, dividers `#e7e5e4` (light) / `#edece8` (lighter) / `rgba(245,244,239,0.12)` (on ink), muted text `#78716c`, faint text `#a8a29e`, accent indigo-200 `#a5b4fc` (highlights on dark), accent indigo-700 `#4338ca` (links/chips on light), chip fill `#edece8`, indigo chip fill `rgba(79,70,229,0.08)`.
- **Labels**: 12px Archivo 600, uppercase, 0.16em tracking (section eyebrows use 13px/0.14em on light backgrounds, color ink).
- **Numbered editorial lists**: index "01" 13px/600 `#a8a29e` min-width 26px, hairline dividers between rows, generous vertical padding.
- **Load animation** `bs-rise`: opacity 0→1 + translateY(16px)→0, ease-out, staggered ~0.1s per block, fill-mode both. Pulsing 7px `#a5b4fc` dot (`bs-dot`: scale 1→1.4, opacity 1→0.6, 2s infinite) marks "live" labels. Respect prefers-reduced-motion.
- **Hover** on clickable rows: `background: rgba(28,25,23,0.04)`, 0.15s ease, 12px radius.
- **Radius**: 12px cards/rows, 8px controls, 999px chips.

## Screens

### 1. Admin Home (`Birdsong Home v2.dc.html`) — /admin
Split screen. **Left 42%** (min 380px), ink bg, padding 48/56px, space-between column: date label → Young Serif greeting "Good {timeOfDay}, {firstName}." (clamp 44–66px, line-height 1.06) → "What's been happening" activity feed (3 recent events: new responses, qualified leads, goals hit; event text 14px/500 cream with survey names in `#a5b4fc`; relative timestamps 12px `rgba(245,244,239,0.45)`; hairline dividers). **Right**: page bg, vertically centered, "WHERE TO NEXT" eyebrow + numbered action rows (title 23px Archivo 600, desc 15px `#78716c`, arrow icon right) linking to: survey builder, dashboard, company profile. Whole row is the link target.

### 2. Company Profile (`Company Profile.dc.html`) — /admin/profile
**Admin shell** (shared with screen 3): 232px ink sidebar, padding 40/28px — Young Serif "Birdsong" wordmark 19px; nav links 14px (inactive: `rgba(245,244,239,0.6)`, hover bg `rgba(245,244,239,0.06)`; active: ink text on cream `#f5f4ef` pill, 8px radius); bottom user chip (30px `#a5b4fc` circle initial + name/role).
**Content**: max-width 760px centered, padding 64/80px. Header: "SETTINGS" eyebrow, Young Serif 40px title, 15px muted intro. Sections separated by `#e7e5e4` top borders, each with uppercase section title + secondary "Edit" button (read-first pattern):
- **Ideal customer profile**: 16px/1.65 body paragraph + neutral segment chips (`#edece8` fill).
- **Brand voice**: indigo tone chips (Warm / Plainspoken / Curious, `#4338ca` on `rgba(79,70,229,0.08)`) + "How your interviewer sounds" sample quote in Young Serif 17px `#44403c` with 2px `#d6d3d1` left border.
- **Survey defaults**: 4-col grid of stat blocks — Young Serif 28px value over 13px muted label (Response goal 25, Max questions 8, Follow-up depth 2, Qualification threshold 70%).

### 3. Survey Settings (`Survey Settings.dc.html`) — /admin/surveys/[id]
Same admin shell (Surveys active). Header: breadcrumb "SURVEYS /" + success Badge "Live"; Young Serif 40px survey title with right-aligned actions (secondary "Preview", ink primary "Share link"). Then bordered sections:
- **Stats row**: 4-col grid — Responses "18/25" (goal fraction in 16px `#a8a29e`), Qualified leads, Avg. duration, Completion rate.
- **Audience & goal**: body paragraph with bold (600) key values.
- **Questions**: helper line 13px `#a8a29e` ("The interviewer asks up to 2 follow-ups…"), numbered question list 16px/1.5, `#edece8` dividers.
- **Qualification**: rule paragraph + white callout card (1px `#e7e5e4` border, 12px radius) with "Try the interview yourself → Open respondent view" link (`#4338ca`, arrow icon) to the respondent screen.

### 4. Respondent Survey (`End User Survey.dc.html`) — public /s/[slug]
Full-screen page bg, no admin chrome. Fixed 3px top progress bar (`#edece8` track, ink fill, width = completed/total, 0.5s cubic-bezier(0.22,1,0.36,1)). Header row: bird glyph + survey name 14px/600 left; "Question N of 5" 13px `#a8a29e` right. Centered column max 640px:
- Pulsing-dot eyebrow "WREN IS ASKING" (interviewer name).
- Question in Young Serif 34px/1.3.
- White textarea (birdsong-ui Textarea, Archivo 16px, 4 rows, placeholder "Take your time — plain language is perfect.").
- Ink "Continue →" button (15px/600 cream text, 12×26px padding, hover `#44403c`) + "or press ⌘ Enter" hint.
- Each question transition re-runs the rise animation; answer state clears.
- Completion state: centered Young Serif 38px "That's everything. Thank you." + muted body; progress bar full; header label "Complete".
- Footer: "Powered by Birdsong" 12px, wordmark in Young Serif.

## Interactions & Behavior
- All admin navigation links per screen descriptions; whole rows are hit targets.
- Respondent flow: Continue or ⌘/Ctrl+Enter submits the answer, advances question, animates in the next; answers accumulate; after last question show completion state. (Production: answers stream to backend; interviewer generates up to 2 follow-ups per question in brand voice — the prototype advances linearly.)
- All load animations one-shot on mount.

## State Management
- Admin: current user (name, initial, role), current date/time-of-day, activity feed events, survey object (title, status, stats, audience, questions, qualification rules), company profile (ICP text, segments, voice descriptors, sample line, defaults).
- Respondent: current question index, draft answer, submitted answers, completion flag.

## Design Tokens
See "Shared Design Language" above — those hex values, the two font families, the type scale (display clamp 44–66 / 40 / 38 / 34; stat 28; row title 23; body 15–16; small 13–14; label 12), spacing (sidebar 232px; content pad 64/80; row pad 34/20 or 18/0), and radii (12/8/999) are the complete token set.

## Assets
No raster assets. Bird glyph + arrows are inline SVG strokes (in the design files).

## Files
- `Birdsong Home v2.dc.html` — admin home
- `Company Profile.dc.html` — company profile settings
- `Survey Settings.dc.html` — survey detail/settings
- `End User Survey.dc.html` — public respondent interview (has working question-flow logic in a script block at the bottom of the file)
