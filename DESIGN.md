# Birdsong Design System

Status: **implemented and applied across the whole platform** — admin home, company
profile, survey settings/detail, and the respondent-facing survey interview. This
document describes the system as it actually exists in code today, not an aspirational
spec — every value below is read directly from `app/globals.css`, `tailwind.config.ts`,
`lib/fonts.ts`, and `components/ui/*`.

**Out of scope:** the marketing pages (`app/landing-page*`), which use their own
`inter`/`newsreader` fonts and are a separate concern. Everything else in the product —
including the respondent interview — is on this system.

**Single theme, no dark mode.** There used to be a light/dark toggle
(`ThemeProvider`/`ThemeToggle`, a `data-theme` attribute); it's been removed entirely.
One `:root` block in `globals.css`, no theme branching anywhere.

Reference: `design_handoff_birdsong_platform/README.md` is the handoff this
implements — "ink-black panels, warm neutrals, Young Serif display type, Archivo UI
type, indigo-200 accents," across all four screens in one shared language.

## Color palette

All values stored as space-separated HSL triplets (shadcn convention) in CSS custom
properties prefixed `--ds-*` in `app/globals.css`, mapped to semantic Tailwind classes
in `tailwind.config.ts` (e.g. `--ds-primary` → `bg-primary`, `text-primary`).

| Token | Class | Hex | Usage |
|---|---|---|---|
| Page background | `bg-page` | `#f8f8f7` | App shell background |
| Card | `bg-card` | `#ffffff` | Cards, popovers, inputs |
| Card foreground | `text-card-foreground` | `#1c1917` (ink) | Headings, primary body text |
| Muted foreground | `text-muted-foreground` | `#78716c` (= Tailwind stone-500) | Secondary text, captions |
| Faint | `text-faint` | `#a8a29e` (= Tailwind stone-400) | Tertiary text, index numbers, placeholders |
| Border | `border-border` | `#e7e5e4` (= Tailwind stone-200) | Card borders, section dividers |
| Chip | `bg-chip` / `border-chip` | `#edece8` | Lighter divider (e.g. between questions), neutral chip fill |
| Primary | `bg-primary` | `#1c1917` (ink) | Primary buttons, active states, progress fill |
| Primary hover | `hover:bg-primary-hover` | `#44403c` (= Tailwind stone-700) | Primary button hover |
| Primary foreground | `text-primary-foreground` | `#f5f4ef` (cream) | Text/icons on ink-filled surfaces |
| Secondary | `bg-secondary` | `#edece8` | Secondary buttons, hover fills |
| Success | `text-success` | `#3a6046` | Muted green — status only (e.g. "Live" badge), unrelated to this handoff, unchanged |
| Success bg | `bg-success-bg` | `#e4ecdd` | Success badge fill |
| Destructive | `text-destructive` / `bg-destructive` | `#dc2626` (red-600) | Delete actions, error text, unchanged |
| Warning | `text-warning` / `bg-warning` | amber-500 | "Draft" badge, unchanged |
| Indigo | `text-indigo` | `#4338ca` | Links/chip text on light surfaces (e.g. "Open respondent view") |
| Indigo light | `text-indigo-light` / `bg-indigo-light` | `#a5b4fc` | Highlights/accents on ink surfaces (survey names in the activity feed, pulsing dot, user-chip avatar) |
| Indigo chip | `bg-indigo-chip` (used at low alpha, e.g. `/[0.08]`) | `#4f46e5` | Indigo chip fill, `rgba(79,70,229,.08)` |
| Sidebar | `bg-sidebar` | `#1c1917` (ink) | The one permanently-dark surface: the icon rail, and the admin home screen's left panel |
| Sidebar foreground | `text-sidebar-foreground` (alpha-modified per state: `/60` inactive, `/50` faint, full for active text) | `#f5f4ef` (cream) | Text on ink surfaces |
| Sidebar active foreground | `text-sidebar-active-foreground` | `#1c1917` (ink) | Text on the *active* nav pill (inverted — ink-on-cream, not cream-on-ink) |
| Sidebar accent | `bg-sidebar-accent` (alpha-modified: `/[0.06]` hover, full for the active pill) | `#f5f4ef` (cream) | Nav hover wash / active pill background |
| Sidebar border | `border-sidebar-border` (used at `/[0.12]`) | `#f5f4ef` (cream) | Dividers on ink surfaces |

Note the sidebar's active-item colors are **inverted** from a typical dark-rail
convention: inactive/hover text stays cream-on-ink, but the *active* item is a solid
cream pill with ink text — straight from the handoff, not a mistake.

## Typography

**Body/UI: [Archivo](https://fonts.google.com/specimen/Archivo)** (`font-archivo`),
weights 400/500/600/700. **Display: [Young Serif](https://fonts.google.com/specimen/Young+Serif)**
(`font-serif`), weight 400 only (the font ships no other weight — always pair with
`font-normal`, never `font-medium`/`font-semibold`, which would be a silent no-op).
Young Serif is for display headings, big numbers (stat blocks), and the wordmark ONLY;
Archivo is everything else. Both from `lib/fonts.ts`.

`font-archivo` is **not** the global `<body>` default — that stays `font-sans` (Inter),
since marketing pages need it. Instead, `font-archivo` is applied once at each section's
layout root and inherits down: `components/AdminShell.tsx` for the whole admin, and
`app/survey/[slug]/page.tsx` for the respondent interview. Don't sprinkle
`font-archivo` on individual components — if body text isn't rendering in Archivo,
the fix is almost always a missing wrapper at the root, not a missing class on the
leaf.

Representative sizes actually in use (not a rigid scale — pulled from real pages):

| Usage | Class | Example |
|---|---|---|
| Display greeting | `font-serif text-[clamp(44px,4.6vw,66px)] font-normal` | Admin home greeting |
| Page H1 | `font-serif text-[40px] font-normal` | "Company profile", "Settings" |
| Survey/response title | `font-serif text-[34px]`–`text-[40px] font-normal` | Survey detail title, interview question |
| Stat value | `font-serif text-[28px] font-normal` | Survey stats row |
| Row title | `text-[23px] font-semibold` (Archivo, not serif) | Admin home action rows |
| Body | `text-sm`/`text-[15px]`/`text-[16px]`, Archivo regular | Default copy |
| Section eyebrow | `text-[13px] font-semibold uppercase tracking-[0.14em]` | Section titles ("BASICS", "QUESTIONS") |
| Label | `text-xs font-semibold uppercase tracking-[0.16em]` | Date label, "WHERE TO NEXT", nav-adjacent labels |
| Wordmark | `font-serif text-[19px]` | Sidebar "Birdsong" |

## Spacing & radius

Spacing uses Tailwind's default scale directly, plus arbitrary values (`px-[72px]`
etc.) where the handoff's spec doesn't land on a default Tailwind step — no custom
spacing tokens.

**Radius:**

| Token | Class | Value | Usage |
|---|---|---|---|
| `--ds-radius-card` | `rounded-card` | `0.75rem` (12px) | Cards, hoverable rows |
| `--ds-radius-control` | `rounded-control` | `0.5rem` (8px) | Buttons, inputs, nav items |
| — | `rounded-full` | 999px | Chips, badges, avatar circles |

**Elevation:** flat everywhere. Cards use a 1px border (`border-border`), never a
shadow.

## Component patterns

All in `components/ui/` (shadcn convention), Radix primitives + `class-variance-authority`,
Tailwind v3.

### Buttons (`components/ui/button.tsx`)

- **`primary`** (default) — `bg-primary text-primary-foreground hover:bg-primary-hover`
  (ink → stone-700 on hover, cream text). The one emphasized action per view.
- **`secondary`** — `border border-border bg-card text-card-foreground hover:bg-secondary`.
- **`destructive`** — solid `bg-destructive`, white text.
- **`ghost`** — no background/border until hover (`hover:bg-secondary`).
- **`link`** — text-only, `text-primary`, underline on hover.

Sizes: `sm` (32px), `default` (36px), `lg` (40px), `icon` (36×36px). All use
`rounded-control`.

### Cards (`components/ui/card.tsx`)

`bg-card`, `rounded-card`, 1px `border-border`, no shadow.

### Form inputs (`components/ui/input.tsx`, `textarea.tsx`)

`rounded-control`, 1px `border-input`, `bg-card`. Focus state is a 2px `ring-ring`.

### Badges (`components/ui/badge.tsx`)

Pill (`rounded-full`), tinted background + full-strength text — `success` (green,
"Live"), `warning` (amber, "Draft"), `destructive`, `default`/`outline`. Unrelated to
and unchanged by this handoff.

### Tables (`components/ui/table.tsx`)

Header: uppercase, `text-muted-foreground`, bottom border only. Rows: bottom border,
`hover:bg-secondary`.

### Admin shell (`components/AdminShell.tsx`, `components/AdminSidebar.tsx`)

Collapsible ink sidebar (`bg-sidebar`), **196px expanded / 64px (`w-16`) collapsed**,
`transition-[width,padding]` 0.2s ease. Top: a toggle button (panel icon, fixed
position regardless of state) + Young Serif "Birdsong" wordmark (hidden collapsed),
then three nav links (Home / Surveys / Company profile), each icon (house / clipboard
/ building — apply the same set to any new admin nav items) + label (label hidden
collapsed, `title` attribute picks up the slack), 8px radius, active item is a solid
cream pill with ink text. Bottom: a 30px indigo-light circle with the user's initial
(always visible) + name/"Admin" role label (hidden collapsed). Hovering the chip
reveals Settings/Sign out (not shown in the static design reference, but has to live
somewhere since the handoff's 3-item nav doesn't include Settings).

Collapsed state is local `useState` in `AdminSidebar`, persisted to `localStorage`
(`bs-sidebar-collapsed`) and re-applied client-side after mount (server/first-client
render always starts expanded, to avoid a hydration mismatch — same tradeoff as the
admin home greeting, see below).

**Important:** the sidebar is `sticky`, not `fixed`, and is a normal flex sibling of
`<main>` in `AdminShell` — `<main>` is just `flex-1`, no `pl-[...]` padding tracking the
sidebar's width. An earlier version used `position: fixed` + a hardcoded `pl-[232px]`
on `<main>` to compensate; once the sidebar's width became dynamic (collapse/expand),
that padding value had no way to stay in sync and the layout could visibly
break/overlap. Don't reintroduce fixed positioning here without also removing this
comment and re-solving that sync problem.

A page can still break out of `<main>`'s `p-8` with `-m-8` for a full-bleed layout
(admin home does this for its split-screen panels; the company profile onboarding
wizard does the same for its own step-navigator sidebar) — that part is unaffected by
the sidebar becoming collapsible.

### Load-in animation (`globals.css`)

`bs-rise`: opacity 0→1 + `translateY(16px)`→0, ease-out. Two flavors:
- `.bs-rise-1` … `.bs-rise-6` — one-shot, staggered, fixed delays (~0.1s apart) for a
  page's initial load (admin home, survey/profile sections).
- `.bs-rise-repeat` — no delay, meant to be reapplied by keying the element (React
  remounts it, restarting the CSS animation) — used for the respondent interview's
  per-question transition.

`bs-dot`: 7px circle, `bg-indigo-light`, scale 1→1.4 + opacity 1→0.6, 2s infinite —
marks "live" labels ("What's been happening", "Wren is asking").

Both are gated behind `@media (prefers-reduced-motion: no-preference)`. Elements
default to their fully-visible resting state via plain Tailwind classes — reduced-motion
users see the final layout immediately, with no animation attempted at all, rather than
a stripped-down version of it.

### Respondent interview (`app/survey/[slug]/InterviewFlow.tsx`)

Single-question view (Typeform-style) over the **unchanged** `/api/interview/start` /
`/api/interview/continue` conversational backend — the interview logic, streaming,
follow-up generation, and the `INTERVIEW_COMPLETE` sentinel were not touched. Only the
latest assistant message renders (as "the question"), not the full transcript; the
completion screen still offers a "See your responses" toggle for the full exchange.
Progress: a 3px fixed top bar (`bg-chip` track, `bg-primary` fill) using the existing
`computeProgressPercent` — deliberately does **not** claim a fixed "Question N of X"
denominator, since the model can genuinely run past `num_questions` (it's a soft
target, not a hard cap). Submits on Cmd/Ctrl+Enter, not plain Enter — plain Enter
inserts a newline, since answers can run long.

## Tooling

- **Library:** [shadcn/ui](https://ui.shadcn.com), Radix UI primitives, Tailwind v3.
- **Config:** `components.json` (style: `new-york`, base color: `neutral`).
- **Adding new components:** `npx shadcn@latest add <component>` defaults to
  Tailwind v4-style output on newer CLI versions — hand-adapt to the v3 pattern in
  `components/ui/button.tsx` (Radix `Slot` + CVA + `hsl(var(--x) / <alpha-value>)`
  tokens) rather than accepting v4 output as-is.
- **Utility:** `lib/utils.ts` exports `cn()` (clsx + tailwind-merge).
- **Icons:** inline SVG (Feather-style strokes), not an icon library.
- **Animation:** `tailwindcss-animate` (unrelated to the `bs-rise`/`bs-dot` keyframes
  above, which are hand-written).
- **Fonts:** `lib/fonts.ts` — `archivo` / `youngSerif` (the platform, wired into
  `tailwind.config.ts` as `font-archivo`/`font-serif`), `inter` / `newsreader`
  (marketing pages only).

### CSS variable naming

Every design-system variable is prefixed `--ds-*` (e.g. `--ds-primary`, `--ds-border`)
rather than the shadcn-conventional unprefixed names, because `--background` and
`--foreground` remain live as separate, unprefixed legacy variables that the plain
`<body>` tag still depends on (see below) — prefixing sidesteps the collision.
`tailwind.config.ts` maps the clean, standard Tailwind class names to the prefixed
vars, so component code never needs to know about the `--ds-` prefix.

## Overscroll / canvas background

Browsers paint the rubber-band overscroll area using `<body>`'s actual
`background-color`, not any inner div's. Since `<body>` itself still carries the
legacy `--background: #ffffff`, `components/AdminShell.tsx` sets
`document.body.style.backgroundColor` to `hsl(var(--ds-page-background))` on mount and
clears it on unmount, scoping the fix to admin routes only.

## Known gaps

Content the design handoff specifies but the data model doesn't back yet — shown where
real, otherwise omitted rather than fabricated:

- **Survey Settings "Survey defaults"-equivalent stats**: the handoff's Company Profile
  screen shows company-wide "Response goal," "Max questions," "Follow-up depth," and
  "Qualification threshold" stat blocks. None have a backing field — there's no
  response-goal, follow-up-depth, or qualification-threshold column anywhere (survey
  `num_questions` is per-survey, not a company default; follow-up depth is currently a
  hardcoded instruction inside the interview system prompt, not configurable;
  qualification is a manual admin action via response status, not a numeric rule).
  This whole section is omitted from Company Profile rather than showing fabricated
  numbers.
- **Survey Settings stats row**: shown with 3 of the mockup's 4 stats (Responses,
  Qualified leads, Completion rate — all real, computed from `responses`). "Avg.
  duration" is omitted — there's no per-response timing data. The "Responses" stat also
  drops the mockup's "/25" goal fraction for the same reason as above.
- **Company Profile "Ideal customer profile" segment chips** and the **"How your
  interviewer sounds" sample quote**: omitted. `target_icp` is one free-text field, not
  discrete segments, and there's no generator for a sample interviewer line.
- **Brand voice**: the handoff shows several simultaneous filled chips (e.g. "Warm,"
  "Plainspoken," "Curious"), which doesn't fit a fixed-enum single-select. Implemented
  as free text (the `tone` column, unchanged shape) split on commas for chip display —
  admins type comma-separated descriptors in their own words.
- **"Wren"** (the interviewer name shown on the respondent screen, "Wren is asking") is
  hardcoded brand copy, not a per-survey or per-company field — same category as
  "Powered by Birdsong."
- **Sidebar collapsed width mismatch in the design files themselves**: `Birdsong Home
  v2.dc.html` specifies 196px/64px; `Company Profile.dc.html` and `Survey
  Settings.dc.html` specify 232px/76px for the same mechanism. Implemented as 196/64
  everywhere, per the explicit written spec that introduced this feature — treat the
  232/76 pair in the other two files as stale if a future handoff touches them again.

## Deviations from the static mockups (kept for real functionality)

The four handoff files show idealized read-only screens; a few real, load-bearing
features aren't depicted there and were kept, styled to match:

- **Company Profile**: "Basics" (name/industry/website/team size/logo) and "What you
  sell"/"Value proposition" sections aren't in the mockup at all — but nothing else in
  the app can edit those fields once onboarding is done, so they stay, in the same
  read-first + per-section "Edit" pattern as the sections that are shown.
- **Survey Settings**: a single "Edit" button (opens the existing full `SurveyForm`,
  unchanged) sits in the header next to Preview/Share link. The mockup's per-section
  "Edit" buttons on "Audience & goal" and "Questions" all open this same form rather
  than editing just that section — splitting `SurveyForm` into independent per-section
  forms would be a real refactor of working, complex form logic, not a styling change.
- **Company Profile / Survey Settings**: the "Edit with AI" bar (Company Profile) and
  the response table (Survey Settings) are real, previously-built features not shown in
  these particular mockups; both were kept and restyled rather than dropped.
