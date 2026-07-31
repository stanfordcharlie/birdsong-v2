# Birdsong Design System

Status: **implemented and applied across the whole platform** — admin home, company
profile, survey settings/detail, and the respondent-facing survey interview. This
document describes the system as it actually exists in code today, not an aspirational
spec — every value below is read directly from `app/globals.css`, `tailwind.config.ts`,
`lib/fonts.ts`, and `components/ui/*`.

**Out of scope:** the marketing pages (`app/page.tsx`, `app/customer-success`), which use
their own Bricolage Grotesque / Spectral (italic) / Inter fonts and their own
`--lp-*`-prefixed color tokens (see `design_handoff_landing_pages_full`) and are a
separate concern. Everything else in the product — including the respondent
interview — is on this system.

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
| Sidebar | `bg-sidebar` | `#121212` (true near-black) | The one permanently-dark surface: the nav rail. Redesigned per `design_handoff_create_survey` — no longer the warm ink `#1c1917` used elsewhere |
| Sidebar foreground | `text-sidebar-foreground` | `#9aa1ac` (cool gray-blue) | Inactive nav text/labels on ink surfaces |
| Sidebar active foreground | `text-sidebar-active-foreground` | `#ffffff` | Text on hover/active nav items and the account row (no longer inverted — hover/active is now a conventional dark-fill-plus-white-text treatment, not a cream pill) |
| Sidebar accent | `bg-sidebar-accent` | `#262626` | Hover/active nav item fill |
| Sidebar border | `border-sidebar-border` | `#333333` | Dividers on ink surfaces |

The active nav item is marked by a 3px indigo (`bg-indigo-chip`) accent bar flush to
the sidebar's left edge (`absolute`, `inset-y-[9px] left-[-14px]`), on top of the same
hover/active dark fill every other item gets on hover — not by a distinct
background/text treatment of its own.

## Typography roles

**Body/UI: [Archivo](https://fonts.google.com/specimen/Archivo)** (`font-archivo`),
weights 400/500/600/700. **Display: [Young Serif](https://fonts.google.com/specimen/Young+Serif)**
(`font-serif`), weight 400 only (the font ships no other weight — always pair with
`font-normal`, never `font-medium`/`font-semibold`, which would be a silent no-op).
Both from `lib/fonts.ts`.

**Hard rule: serif is page-title only.** Young Serif appears in exactly one place in
the admin: the single large page title at the top of each page (the `.type-page-title`
role). Nothing else — not table cell content, not card headings, not section titles,
not survey names, not form headings, not stat values. Everything else is Archivo on
the fixed scale below. (The sidebar wordmark uses Spectral, a different serif — see
the exceptions note below.)

Every role is a reusable utility class defined in `app/globals.css` (`@layer
components`) — pages reference roles, not raw sizes. Because the roles live in the
components layer, a single plain utility at a call site can still override one
property (e.g. the survey-detail breadcrumb uses `.type-label` plus its own hover
color).

| Role | Class | Font | Size / weight | Color | Used for |
|---|---|---|---|---|---|
| Page title | `.type-page-title` | Young Serif | 40px / 400, line-height 1.1, tracking −0.01em | ink | The one large title per page: "Your surveys", "Your lead queue", "Settings", "Company profile", "New survey", the dashboard greeting, the survey-detail title |
| Section label (eyebrow) | `.type-label` | Archivo | 13px / 600, uppercase, tracking 0.14em | muted | Page eyebrows ("SURVEYS", "SETTINGS", the dashboard date), section titles ("BASICS", "REPORT", "WHERE TO NEXT"), breadcrumbs |
| Card / section heading | `.type-heading` | Archivo | 17px / 600, tracking −0.01em | ink | Card headings ("Change email", "Account"), dashboard action-row titles, report titles. 16–18px / 600 is the sanctioned band when a sub-heading needs one step down (report theme `h4`s sit at 16px). |
| Body | `.type-body` | Archivo | 15px / 400, line-height 1.6 | ink | Default copy and long-form read views; `text-sm` (14px) remains fine for denser UI copy |
| Meta / secondary | `.type-meta` | Archivo | 13px / 400 | muted | Timestamps, slugs, created dates, attributions |
| Table header | (baked into `components/ui/table.tsx`) | Archivo | 12px (`text-xs`) / 600, uppercase, tracking wide | muted | Every table `<th>` |
| Table cell | (baked into `components/ui/table.tsx`) | Archivo | 14px (`text-sm`) / 400 | ink | Every table `<td>`; row-title cells (survey internal names) step up to `text-[15px] font-medium` |

Sanctioned exceptions to the serif rule, all deliberate: the sidebar wordmark
(`font-spectral text-[21px]` — branding, not a heading, and a different serif face
than `.type-page-title`'s Young Serif — reuses the Spectral face already loaded for
the respondent interview rather than adding a second one), the company-profile setup
wizard's step titles (serif 28px — each wizard step's single page title, sized down
to fit its card; the wizard's left-rail "Company Profile" label is sans), and the
new-survey wizard's live preview panel, which renders the respondent-facing external
name in `font-spectral` to match the real respondent interview title (see "New
survey wizard" below) — not `.type-page-title`, since it's mimicking respondent-facing
copy, not an admin page title.

`font-archivo` is **not** the global `<body>` default — that stays `font-sans` (Inter),
since marketing pages need it. Instead, `font-archivo` is applied once at each section's
layout root and inherits down: `components/AdminShell.tsx` for the whole admin, and
`app/survey/[slug]/page.tsx` for the respondent interview. Don't sprinkle
`font-archivo` on individual components — if body text isn't rendering in Archivo,
the fix is almost always a missing wrapper at the root, not a missing class on the
leaf. (The `.type-*` role classes each carry `font-archivo`/`font-serif` themselves,
so they're safe anywhere.)

## Layout containers & spacing rhythm

Every admin page's content sits in one of two shared containers (utility classes in
`globals.css`), horizontally centered in the space to the right of the sidebar:

| Class | Max width | Used by |
|---|---|---|
| `.admin-container` | 920px | Form/detail pages: dashboard, Company profile, Settings, New survey, response detail |
| `.admin-container-wide` | 1140px | Table pages: Surveys, Leads, survey detail |

Both are `mx-auto w-full pt-6`; combined with `AdminShell`'s `p-8` this puts the
eyebrow label 56px from the viewport top on every page, with 32px of horizontal
padding once the viewport is narrower than the container. Each route's `loading.tsx`
skeleton uses the same container as its page so nothing jumps when content arrives.

**Page header pattern:** every page opens with an eyebrow (`.type-label`) 8–10px
above its serif page title, then `gap-7` (28px) / `mb-10` before the first section.

**Vertical rhythm:** 40–48px between major sections (`mt-12` between dashboard
sections; Company profile sections are `py-6` each side of a divider = 48px
title-to-title), 16–24px within a section (section label → content is `mb-4`).

The only full-bleed layout left is the company-profile setup wizard, which cancels
`AdminShell`'s `p-8` with `-m-8` for its own step-navigator rail. The admin home no
longer does this — it sits on `.admin-container` like every other page.

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

**Elevation:** flat for surfaces in the page flow — cards use a 1px border
(`border-border`), never a shadow. Floating layers only (the sidebar account
popover, collapsed-nav tooltips) add `shadow-lg` on top of their border so they
read as intentional menus above the page.

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

Redesigned per `design_handoff_create_survey`, 252px fixed width. Later widened
its gutters and gained a collapse toggle back (a new feature, not a revival of the
old 196px/64px localStorage-based mechanism the handoff removed — see the note at
the bottom of this section). **240px expanded / 64px collapsed**, animated with a
200ms width transition. Horizontal padding is a consistent 16px (`px-4`) across the
logo row, "WORKSPACE" label, nav, and account row when expanded. **Top-anchored
stack**: favicon logo (30×30, `rounded-control`) + Spectral serif "Birdsong"
wordmark (21px/600, see below) sit at the top (`mb-[30px]`) alongside a small
collapse-toggle button (chevron, rotates 180° between states), then a "WORKSPACE"
section label (11px/600, uppercase, tracking `.12em`, `hsl(0 0% 42%)`, hidden while
collapsed), then the nav links directly beneath.

**Collapsed state (64px):** icons only, centered in a 40×40 hit target; labels
drop to a `title`/`aria-label` plus a hover tooltip (`bg-card`, `border-border`,
`rounded-control`, `shadow-lg`, `text-sm`, flush against the rail's right edge via
`left-full ml-2`) rather than being rendered inline. The account row collapses to
just the avatar, with its Settings/Sign out popover flying out beside the rail
(`left-full`, fixed `w-48`) instead of above it, since 64px can't fit the menu
text. Toggle by clicking the chevron button or `Cmd+B` / `Ctrl+B` (ignored while
a text input/textarea/contenteditable has focus, since Cmd+B is also "bold" in
rich text elsewhere in admin). Preference persists via a `sidebar_collapsed`
cookie (`path=/admin`, not `localStorage`) read server-side in
`app/admin/layout.tsx` and passed down as the initial state, so there's no
expand/collapse flash on load.

Four nav links (Home / Leads / Surveys / Company profile), 19px icons (1.4px stroke
— a rounder, thinner set than the old Feather-style icons; apply the same style to
any new admin nav item), 15px/500 label, `gap-[13px]`, `rounded-control`. Hover and
active both get the same treatment — solid dark fill (`bg-sidebar-accent`) + white
text (`text-sidebar-active-foreground`) — with the *active* route additionally
marked by a 3px indigo (`bg-indigo-chip`) accent bar flush to the rail's left edge.
This is a departure from the rest of the platform's Young-Serif-is-page-title-only
rule: the sidebar wordmark uses `font-spectral`, not `font-serif` (Young Serif) —
Spectral is already loaded for the respondent interview (`lib/fonts.ts`), reused
here rather than adding a second serif face.

Bottom, pinned with `mt-auto`/a trailing flex spacer: a 34px indigo (`bg-indigo-chip`)
circle with the user's initials + name/"Admin" role label + a chevron icon. Clicking
it toggles the same Settings/Sign out popover as before (not shown in the static
design reference, but has to live somewhere since the handoff's nav doesn't include
Settings) — click-toggled, not hover-revealed, for the same reasons as before:
outside click, Escape, and any navigation dismiss it. Popover styling unchanged:
`bg-card`, 1px `border-border`, `rounded-card`, `shadow-lg`, `p-1.5`, items `text-sm`
with `py-3` and `hover:bg-secondary`, inset to the rail's padding (`left-2 right-2`).

**Important:** the sidebar is `sticky`, not `fixed`, and is a normal flex sibling of
`<main>` in `AdminShell` — `<main>` is just `flex-1`, no `pl-[...]` padding tracking
the sidebar's width. Don't reintroduce fixed positioning on the sidebar without also
adding matching padding to `<main>`.

A page can still break out of `<main>`'s `p-8` with `-m-8` for a full-bleed layout —
the company profile onboarding wizard does this for its own step-navigator sidebar,
and the new-survey wizard's External name step does the same for its two-pane layout
(see below). (The admin home used to as well, for a split-screen dark panel; it now
sits on `.admin-container` — see "Layout containers & spacing rhythm".)

### New survey wizard (`components/NewSurveyWizard.tsx`)

Every step but one is a plain boxed card on `.admin-container`, unchanged. The
**External name** step (`design_handoff_create_survey`) is the one exception: it
takes over the full content area with `-m-8 flex h-screen overflow-hidden` (same
cancel-AdminShell's-padding trick as the company profile wizard) and splits into two
independently-scrolling panes — a `flex-[1_1_55%]` form column (white card, Back
link, "Step X of Y", title, AI suggestion pills, name input, OK button) and a
`flex-[1_1_45%]` live preview column, `border-l border-border`. Only this one step
does this; navigating to any other step (including Back/Next from this one) returns
to the normal boxed layout, so the page's outer "Surveys" eyebrow / "New survey"
title (rendered by `NewSurveyWizard` itself, not `page.tsx` — it has to be
per-step-conditional) reappears there.

AI suggestion pills are full-width stacked buttons (`bg-indigo-chip/[0.07]`,
`border-indigo-chip/25`, `rounded-[18px]`), not the small flex-wrap chips used by the
public-description step's single suggestion card. Picking one sets it apart with an
inset ring (`ring-2 ring-inset ring-indigo-chip`, `border-transparent`,
`bg-indigo-chip/10`); typing in the name input clears the selection. "Regenerate
suggestions" reuses the same `/api/surveys/suggest-names` call as before — its
refresh icon spins for as long as that real fetch is in flight, not a fixed mock
delay.

The live preview panel (`SurveyPreviewPanel`) is a simplified, stylized mock of the
real respondent welcome screen — not a literal re-render of
`InterviewFlow.tsx`'s (more elaborate) welcome stage — using the same cream palette
that screen hardcodes as raw hex (`#f3ecdf`/`#fffdf7`/`#e7ddc9`/`#241f18`/`#6f6757`/
`#a89d88`): a browser-chrome header (traffic lights + URL pill showing the real
domain and live slug), a gift-card badge (`bg-success-bg`/`text-success` — this one
detail *does* map to an existing `--ds-*` token, and is only shown when the admin
actually set a gift card amount earlier in the wizard), the live external-name value
as the title (`font-spectral`), ghost input fields, and a "Powered by Birdsong"
footer. Updates on every keystroke, reusing the wizard's own real `slug`/`externalTitle`
state (and the real `slugify()` from `lib/surveys/slugify.ts`) rather than a
separate mock slug rule.

### Load-in animation (`globals.css`)

`bs-rise`: opacity 0→1 + `translateY(16px)`→0, ease-out. Two flavors:
- `.bs-rise-1` … `.bs-rise-6` — one-shot, staggered, fixed delays (~0.1s apart) for a
  page's initial load (admin home, survey/profile sections).
- `.bs-rise-repeat` — no delay, meant to be reapplied by keying the element (React
  remounts it, restarting the CSS animation) — used for the respondent interview's
  completion screen.
- `.q-reveal-pop` / `.q-reveal-fade` — the respondent interview's per-question
  entrance (rise-and-settle with slight scale, or plain fade). Which one (or
  neither) applies is a one-line config in `InterviewFlow.tsx` (`QUESTION_REVEAL`:
  `"pop" | "fade" | "none"`). The old word-by-word typing reveal is gone.

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

That only solves the light content column, though — no single body color can also
match the dark sidebar rail, so bouncing past the page edge still showed the rail
"ending" in dead white space above/below it. The same `AdminShell` effect therefore
also sets `overscroll-behavior-y: none` on `<html>` (the document scroller) while an
admin page is mounted: admin routes don't rubber-band at all; the page stops at its
edges. Respondent and marketing pages keep the native bounce.

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
- **Sidebar collapse removed, then reintroduced as a new feature**: `design_handoff_create_survey`
  removed the sidebar's collapsed state entirely (fixed 252px). The earlier 196px/64px
  collapsible mechanism (and its 232px/76px stale-spec footnote from an older handoff)
  no longer applies. Collapse was later added back at 240px/64px with a cookie instead
  of `localStorage` — see "Admin shell" above — built fresh rather than restoring the
  removed code.

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
- **New survey wizard — External name step** (`design_handoff_create_survey`): the
  handoff's browser-chrome URL pill shows a literal `www.usebirdsong.com` example;
  implemented using the real `NEXT_PUBLIC_APP_URL`-derived domain with no `www.`
  prefix added, matching what `lib/email/lead-notification.ts`/`lib/slack/lead-notification.ts`
  actually send rather than the mockup's illustrative example. The gift-card badge
  ("$25 GIFT CARD") is real, wired to the wizard's own `giftCardAmount` state from an
  earlier step, and omitted rather than shown as a fabricated placeholder when that
  field is empty. The "~10 minutes" estimate next to it has no backing field (there's
  no rough-duration calculation available at this point in the wizard) and stays as
  the mockup's static illustrative copy.
