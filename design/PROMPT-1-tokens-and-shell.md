# Prompt 1 of 5: Admin design system tokens and shell (Ledger II)

Single pass. No approval gates, no mid-run check-ins. Read first, then build, then verify, then report.

## Context

We are replacing the admin design system with "Ledger II": light, dense, CRM-style. Manrope for all text, IBM Plex Mono for numbers, slate text, one teal accent, borders instead of shadows, 10px controls and 14px cards instead of pills. This prompt changes tokens, fonts, primitives and the shell only. Pages pick up the change through the primitives. Page layouts are later prompts.

Reference, READ ONLY:
- `design/design-system/README.md` (brand book, read fully before writing anything)
- `design/design-system/tokens.json` (every value)
- `design/mockups/Sidebar.html` (the new sidebar, exact)
- `design/mockups/Leads.html` (use its top bar, stat row, segmented tabs, buttons, chips and badges as the reference for primitives)

## Read first

1. `app/globals.css`: list every `--ds-*` token and the `.survey-theme` block. Do not touch `.survey-theme`.
2. `lib/fonts.ts`
3. `components/admin/ui/*`: list every export and grep its consumers under `app/admin/**` and `components/`.
4. `components/AdminSidebar.tsx`, `components/AdminShell.tsx`, `components/AdminChrome.tsx`, `app/admin/layout.tsx`
5. `middleware.ts` for the auth-exempt route list, and the matching bare-route list in `AdminChrome`. Read only. Confirm they match; if they do not, report it, do not fix.
6. `app/admin/styleguide/page.tsx`

## IN SCOPE

- `app/globals.css`: the `--ds-*` block only
- `lib/fonts.ts`
- `components/admin/ui/**`
- `components/AdminSidebar.tsx`, `components/AdminShell.tsx`, `components/AdminChrome.tsx`
- `app/admin/layout.tsx`
- `app/admin/styleguide/page.tsx`
- `DESIGN.md` (rewrite to mirror the new tokens)

## OUT OF SCOPE

- Every page under `app/admin/**` other than `layout.tsx` and `styleguide/page.tsx`. Do not restyle pages. If a page breaks because a primitive's prop changed, fix the call site minimally and list it in the report.
- `components/ui/*` (shared with respondent and marketing surfaces)
- `app/survey/**`, `app/r/**`, `.survey-theme`, `components/SurveyInterview.tsx`
- `lib/interview/**`, `lib/complete-response.ts`, anything touching `INTERVIEW_COMPLETE`
- `middleware.ts`
- Database, migrations, API routes

## READ ONLY

`design/**`, `components/ui/*`, `middleware.ts`, `app/survey/**`, `lib/interview/**`

## Tasks

### 1. Tokens in `app/globals.css`

Replace the `--ds-*` block with tokens from `design/design-system/tokens.json`. Keep the `--ds-` prefix. Name mapping:

Color (tokens.json name → CSS):
- bg → `--ds-bg`, bg-sidebar → `--ds-bg-sidebar`, bg-track → `--ds-bg-track`
- border → `--ds-border`, border-dashed → `--ds-border-dashed`
- ink → `--ds-ink`, ink-2 → `--ds-ink-2`, ink-3 → `--ds-ink-3`, muted → `--ds-muted`, muted-2 → `--ds-muted-2`, muted-3 → `--ds-muted-3`
- accent → `--ds-accent`, accent-weak → `--ds-accent-weak`, accent-bright → `--ds-accent-bright`, accent-soft → `--ds-accent-soft`
- status-new, status-new-bg, status-new-text → `--ds-status-new`, `--ds-status-new-bg`, `--ds-status-new-text`
- warn, warn-bg, warn-border, warn-text, warn-bg-badge → `--ds-warn`, `--ds-warn-bg`, `--ds-warn-border`, `--ds-warn-text`, `--ds-warn-bg-badge`
- danger → `--ds-danger`, on-ink → `--ds-on-ink`, on-ink-muted → `--ds-on-ink-muted`

Keep these existing names as aliases so nothing breaks: `--ds-accent-text` = `--ds-accent`, `--ds-accent-live` = `--ds-accent`, `--ds-focus` = `--ds-accent`. `--ds-cover-1/2/3` become `--ds-accent-weak`, `--ds-bg-track`, `--ds-bg-sidebar`.

Radius: `--ds-radius-chip: 8px`, `--ds-radius-control: 10px`, `--ds-radius-card: 14px`, `--ds-radius-hero: 18px`, `--ds-radius-pill: 999px`. Any existing `--ds-radius-*` names map to the closest of these (12px card → 14, 8px control → 10, 999 button → 10, not pill).

Shadow: `--ds-shadow-input`, `--ds-shadow-active-nav`, `--ds-shadow-float` from tokens.json. The old card shadow token becomes `none`; cards use a 1px `--ds-border`.

Timing: `--ds-ease-out`, `--ds-duration-enter`, `--ds-duration-count`, `--ds-duration-wave`, `--ds-duration-pulse`.

Type: `--font-display` and `--font-body` both point at Manrope. Add `--font-mono` for IBM Plex Mono. Remove Young Serif and Archivo from the admin surface entirely. Utility classes for the type styles in tokens.json (`.ds-h1`, `.ds-stat`, `.ds-row-primary`, `.ds-control`, `.ds-caption`, `.ds-eyebrow`, `.ds-mono-chip`, `.ds-mono-count`, `.ds-mono-kbd`) with the exact size, weight, line-height and letter-spacing values. H1 is 30px/800/-0.03em, not 44px. Keep `PageHeader` stripping the terminal period.

Focus: keep the single `:focus-visible` rule, 2px ring in `--ds-accent`, 2px offset.

### 2. Fonts in `lib/fonts.ts`

Load Manrope (400, 500, 600, 700, 800) and IBM Plex Mono (400, 500) via `next/font/google`. Export them on the same names the layout already consumes. Remove Young Serif and Archivo imports.

### 3. Primitives in `components/admin/ui/`

Rework every existing primitive to the new tokens without changing its public props unless unavoidable. Specifics, all from `design/mockups/Leads.html`:

- `Button`: variants primary (accent fill, white text), secondary (white, 1px border, ink-3 text), dashed (dashed border-dashed, muted text), ink (ink fill, white text). Sizes: default 34px tall, padding 0 12px (14px for primary), 13px/700; small 28 to 32px, radius chip, 12px. Radius control. No pill. Optional `kbd` prop renders a mono hint after the label.
- `Card`: bg white, 1px border, radius card, no shadow. Optional header row: 44px, bg-sidebar, 13px/700 title, optional right-side link in accent.
- `StatRow`: one joined bar, radius card, cells divided by 1px border, padding 14px 20px, label 12px/600 muted-2, value 24px/800/-0.03em. `emphasis` prop turns the value accent. Optional `note` after the value in 12px.
- `FilterTabs` (segmented): bg-track track, 3px padding, radius control; tabs 30px, padding 0 12px, 13px/700; active on white with shadow-active-nav; count after the label.
- New `SectionTabs`: text tabs 40 to 42px tall on a border baseline, active gets an inset 2px accent underline. For Responses / Prospects / Report style page sections.
- `Badge` → status badge: 26px tall, radius chip, 12px/700, 6px dot, with the state table from the README (New, Contacted, Meeting, In HubSpot, Live, Draft, Failed). Prop is a state key, not free text.
- New `ScoreChip`: 32×28, radius chip, mono 14px/500. Score 9 = accent fill white text; 7 to 8 = accent-weak with accent text; below 7 = bg-track with ink-3. `variant="fit"` is always bg-track / ink-3. `size="hero"` = 56px tile, radius card, mono 26px.
- `SearchInput`: 34px, radius control, 1px border, icon left, optional `⌘K` mono hint right.
- `DataTable`: header row 42px on bg-sidebar with 12px/700 muted-2 labels; rows 60px (two-line) or 54px (one-line), 1px border top, padding 0 20px, 16px column gap. Add a `StackedCell` helper: primary 15px/700, secondary 12px muted-2, both ellipsized.
- `EmptyState`, `StatusDot`: retoken only.
- New `FloatingBar`: absolute, bottom 28px, centered; ink ground, radius pill, 6px padding, shadow-float; children are 38px pill buttons, transparent with white text, and exactly one `primary` rendered white with ink text. Export but do not mount it anywhere in this prompt.
- New `Waveform`: props `seed`, `bars` (default 24), `live`, `tone` (light | ink | muted). 3px bars, 3px gap, radius chip ends, deterministic heights from the seed. When `live`, bars scale Y 25% to 100% on `--ds-duration-wave` with per-bar delay. Export; do not mount yet.

### 4. Shell

- `AdminSidebar`: rebuild to match `design/mockups/Sidebar.html` exactly. 240px, bg-sidebar, 1px right border. Top to bottom: wordmark (24px rounded ink tile with four accent-bright bars, then "Birdsong" 16px/800), search-or-jump input with ⌘K hint (wire it to whatever command palette or search exists; if none, focus the input and no-op), Workspace section (Home, Live with live count pill, Leads with count, Projects), Active studies section (live studies with a 6px dot, response count in mono, drafts with "Draft"; a small plus that links to new study), account row at the bottom with avatar initials on accent-bright, name, workspace, and a gear icon button that links to `/admin/settings`. Company profile and Settings are no longer nav items. Active item: white ground, shadow-active-nav, ink 700. The counts and study list come from the same queries the pages already use; if a query does not exist, render the section with real studies and omit counts rather than inventing them.
- `AdminChrome` / `AdminShell`: top bar 56px, 1px border bottom, breadcrumb left (13px/700 for the current page, muted-2 for parents with a "/" separator), actions slot right. Content area padding 28px 32px. Provide a `PageTopBar` primitive pages can pass `crumbs` and `actions` to; wire the existing pages' existing header content into it only where that is a one-line change, otherwise leave pages alone.
- Bare routes (login, signup, forgot-password, reset-password) stay bare. Do not change the list.

### 5. Styleguide

Update `app/admin/styleguide/page.tsx` to render every token and every primitive above in every state, using the utility classes. This is how we verify.

### 6. DESIGN.md

Rewrite to mirror the new `--ds-*` tokens, fonts and primitive list. Note that `app/globals.css` wins on any disagreement.

## Rules

- No em dashes in any user-visible string. No "survey" in user-visible copy; "study" and "Projects".
- No beige, cream, gradients, blobs, pill buttons (FloatingBar is the one exception), left-border cards, or a second accent color.
- Numbers, scores, counts, timestamps and keyboard hints use `--font-mono`.
- Before editing any export in `components/admin/ui/`, grep all consumers. After editing, grep again and fix any broken call site inside `app/admin/**` minimally.
- `components/ui/*` stays byte-identical. Verify with `git diff --stat`.
- Do not create new routes, tables, migrations or API changes.

## Verify

1. `npx tsc --noEmit` clean.
2. `npm run build` clean. Paste warnings if any.
3. `npm run dev`, load `/admin/styleguide`, `/admin`, `/admin/leads`, `/admin/surveys`, `/admin/settings`, `/admin/login`. No console errors. Confirm the sidebar renders on the first five and not on login.
4. `git diff --stat` shows changes only in the IN SCOPE paths.
5. `grep -rn "Young Serif\|Archivo\|font-serif" app/admin components/admin lib/fonts.ts` returns nothing.
6. `grep -rn "survey" app/admin --include=*.tsx | grep -v "surveys/\|/surveys\|survey_id\|surveyId"` and review each hit is not user-visible copy.

## Final report format

```
## Prompt 1 report

### Tokens
- Renamed: (old → new, one per line)
- Added:
- Aliased for compatibility:

### Primitives
- Changed: (name: what changed, prop changes if any)
- Added:

### Shell
- Sidebar: (what is wired to real data, what is static)
- Top bar:

### Call sites touched outside components/admin/ui
- (file: one line why)

### Verification
- tsc:
- build:
- routes loaded:
- git diff --stat: (paste)
- font grep:
- survey grep:

### Middleware vs AdminChrome bare-route lists
- Match: yes/no (details)

### Open issues
- (anything you could not do, and why)
```
