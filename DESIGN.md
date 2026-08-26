# Birdsong Design System

**`app/globals.css` is the single source of truth. This document is a human-readable
mirror of it.** Where the two disagree, the stylesheet wins and this file is out of
date. Every value below is read from `app/globals.css` and `tailwind.config.ts`, not
proposed by this document.

`/admin/styleguide` renders the whole system live. Check it before adding any UI.

## Scope

| Surface | Design system | Tokens |
|---|---|---|
| **Admin** (`app/admin/**`, `components/admin/**`, `AdminSidebar`) | This document | `--ds-*` |
| Respondent survey (`app/survey/[slug]`) | Its own, light + dark | `--sv-*` |
| Marketing (`app/page.tsx`, `app/customer-success`, `/terms`, `/privacy`) | Its own | `--lp-*` |
| Auth screens (`components/auth/AuthScreen.tsx`, login, signup) | Its own (`design_handoff_auth`) | Bricolage Grotesque, local literals |

The last three are **out of scope for this document**. They are separate designed
surfaces with their own handoffs, and admin must not reach across into their tokens.
Admin did exactly that in two places before the unification pass; both are gone (see
the changelog).

Single light theme for admin. No dark mode, no theme branching.

---

## Import boundaries

```
admin pages, admin components   ->  components/admin/ui
respondent survey, marketing    ->  components/ui
```

`components/ui/{button,card,badge}.tsx` and `components/admin/ui/{Button,Card,Badge}.tsx`
are **intentionally forked**. They are not duplicates awaiting cleanup.

The `components/ui` copies are consumed by the respondent survey, `NewSurveyWizard`,
`SurveyForm` and the marketing pages, all of which are out of scope for the admin design
system. Unifying them would mean redesigning those surfaces, which is a different
project.

**Neither side edits the other's copy.** A change to the admin button belongs in
`components/admin/ui/Button.tsx` only.

Read-only from admin, because the respondent surface imports them:
`components/ui/badge.tsx`, `components/marketing/PerchedBird.tsx`,
`components/LoadingScreen.tsx`, `components/BirdLoader.tsx`, `components/useLoadingGate.ts`,
`lib/fonts.ts`.

---

## Fonts

| Role | Face | Token | Tailwind |
|---|---|---|---|
| Display | **Young Serif** | `--font-display` → `--font-young-serif` | `font-serif` |
| Body / UI | **Archivo** | `--font-body` → `--font-archivo` | `font-archivo` |

Loaded in `lib/fonts.ts`, applied at `AdminShell`.

**Admin is not Inter.** Inter is the global `<body>` default that the marketing pages
still use; admin overrides it. Any documentation claiming the admin body face is Inter
is stale. Young Serif is page-title only: no other element in admin uses the display
face, stat values explicitly included.

---

## Layout

| Token | Value | Where |
|---|---|---|
| `--ds-container-max` | `1140px` | The one admin container |
| `--ds-container-pad-x` | `32px` | Horizontal inset, from `AdminShell`'s `p-8` |
| `--ds-container-pad-y` | `56px` | Viewport top to eyebrow |
| `--ds-rhythm-header` | `32px` | Page header to first content block |
| `--ds-rhythm-block` | `40px` | Between major content blocks |

**One container.** `PageShell` is the only thing in the codebase that applies
`.admin-container`. No page overrides it and no page adds a second inset, which is what
puts every admin H1 on the same x coordinate.

**A page that needs a narrower measure constrains the block, not the page.** Use
`.admin-measure` (720px) on the prose or form block. This is the rule that replaced the
old 920px container: Company profile, Settings, Response detail and Live detail used to
sit visibly further inset than every other page because they used a second, narrower
container.

### Spacing

Base unit 8. **These are the only allowed steps.**

| Token | Value |
|---|---|
| `--ds-space-1` … `-9` | `4 · 8 · 12 · 16 · 24 · 32 · 40 · 56 · 72` |

---

## Type scale

Pages reference **roles**, never a raw size. Defined in `app/globals.css` under
`@layer components`.

| Role | Size / line-height / tracking | Weight | Where |
|---|---|---|---|
| `.type-eyebrow` | 12 / 1.2 / 0.08em, uppercase | 600 | The section name above an H1 |
| `.type-page-title` | 44 / 1.05 / -0.02em, Young Serif | 400 | The one H1 per page |
| `.type-subhead` | 17 / 1.5, `max-width: 52ch` | 400 | The sentence under an H1 |
| `.type-section-label` | 13 / 1.2 / 0.06em, uppercase | 600 | A label over a card or section |
| `.type-table-head` | 12 / 1.2 / 0.06em, uppercase | 600 | Table headers, field labels |
| `.type-metric-value` | 32 / 1.1, `tabular-nums` | 500 | Every stat value |
| `.type-metric-label` | 14 / 1.4 | 400 | Every stat label |
| `.type-heading` | 17 / -0.01em | 600 | Card and section headings |
| `.type-body` | 15 / 1.55 | 400 | Running text |
| `.type-body-sm` | 13 / 1.5 | 400 | Secondary running text |
| `.type-meta` | 13, muted | 400 | Timestamps, inline meta |
| `.type-code` | 13 / 1.5, monospace | 400 | The AI prompt block, `?src=` fragments |

**Eyebrow and section label are two roles, not one.** A single `.type-label` used to do
both jobs, which is why the label over an H1 and the label over a card section rendered
identically and neither read as subordinate to the other.

**No H1 carries a terminal period.** `PageHeader` strips one structurally, so a title
passed in with a period cannot reintroduce the inconsistency.

**Tabular figures are part of the metric role**, not a call-site choice. A column of
proportional figures does not line up, which is the whole point of a metric.

### Named font sizes

For controls, which need a size without also inheriting a colour and a line height. A
primitive uses these instead of writing a raw px value. Defined in
`tailwind.config.ts` under `fontSize`.

| Token | Value | Where |
|---|---|---|
| `text-micro` | 11.5px | Small badges, avatar initials |
| `text-count` | 12px | Counts beside a filter tab |
| `text-control` | 13px | Small buttons, badges, chips |
| `text-nav` | 15px | Sidebar nav items only |
| `text-wordmark` | 21px | Sidebar wordmark only |
| `text-display-sm` | 28px | Setup-wizard step titles only |

---

## Color

Stored as space-separated HSL triplets so Tailwind's alpha modifier (`bg-brand/80`)
works. Every design-system variable is prefixed `--ds-*`, because unprefixed
`--background` / `--foreground` are live legacy variables that plain `<body>` still
reads.

### Surfaces

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--ds-page-background` | `#f8f8f7` | `bg-page` | The app canvas, set on `AdminShell` |
| `--ds-card` | `#ffffff` | `bg-card` | Every card and table surface |
| `--ds-chip` | `#edece8` | `bg-chip` | Hairlines inside a card, neutral chip fill |
| `--ds-secondary` | `#edece8` | `bg-secondary` | Row hover, quote blocks, sunken panels |
| `--ds-border` | `#e7e5e4` | `border-border` | Card outlines, section dividers |

### Ink

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--ds-card-foreground` | `#1c1917` | `text-card-foreground` | Primary text |
| `--ds-muted-foreground` | `#78716c` | `text-muted-foreground` | Secondary text, eyebrows, labels |
| `--ds-faint` | `#a8a29e` | `text-faint` | Tertiary text: timestamps, counts |

### Accent

Green is a **real token now**, not an informal reuse of the status colour it used to
borrow. `--ds-success` keeps its own meaning for genuine status and happens to share the
hue.

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--ds-accent` | `#3a6046` | `bg-brand` / `text-brand` | Score bars, avatars, accent fills |
| `--ds-accent-weak` | `#e4ecdd` | `bg-brand-weak` | Tinted fill behind accent text |
| `--ds-accent-text` | `#2c4a36` | `text-brand-text` | Accent text on `accent-weak` (7.4:1) |
| `--ds-accent-live` | `#3a6046` | `bg-brand-live` | The live dot, everywhere |

### Action and state

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--ds-primary` | `#1c1917` | `bg-primary` | Primary button fill |
| `--ds-primary-hover` | `#44403c` | `bg-primary-hover` | Primary button hover |
| `--ds-destructive` | `#dc2626` | `text-destructive` | Errors, destructive actions |
| `--ds-warning` | `#f59e0b` | `bg-warning` | Test badges, draft markers |
| `--ds-focus` | `#1c1917` | `ring-focus` | The focus ring |

### Survey card covers

Exactly three, assigned by a stable hash of the survey id. **Flat fills, not gradients.**

| Token | Value | Tailwind |
|---|---|---|
| `--ds-cover-1` | `#e4ecdd` | `bg-cover-1` |
| `--ds-cover-2` | `#edece8` | `bg-cover-2` |
| `--ds-cover-3` | `#dfe6ea` | `bg-cover-3` |

### Sidebar

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--ds-sidebar` | `#121212` | `bg-sidebar` | The rail ground |
| `--ds-sidebar-accent` | `#262626` | `bg-sidebar-accent` | Nav hover and active fill |
| `--ds-sidebar-foreground` | `#9aa1ac` | `text-sidebar-foreground` | Inactive nav text |
| `--ds-sidebar-active-foreground` | `#ffffff` | `text-sidebar-active-foreground` | Active nav, account name |
| `--ds-sidebar-plate` | `#ffffff` | `bg-sidebar-plate` | Plate fill and border, at low alpha |
| `--ds-sidebar-label` | `#6b6b6b` | `text-sidebar-label` | The "Workspace" section label |
| `--ds-sidebar-muted` | `#d8d2c4` | `text-sidebar-muted` | Plate secondary text |

---

## Radius, elevation, focus

| Token | Value | Where |
|---|---|---|
| `--ds-radius-control` | `8px` | Inputs, selects, small chips |
| `--ds-radius-card` | `12px` | Every card and panel |
| `--ds-radius-pill` | `999px` | Every button, badge, dot, meter |
| `--ds-shadow-card` | `0 4px 14px rgba(28,25,23,.06)` | The one card elevation |
| `--ds-shadow-card-hover` | `0 6px 20px rgba(28,25,23,.09)` | Hover step for cards that are links |

**Focus.** One rule: `.focus-ring` gives `:focus-visible` a 2px ring in `--ds-focus` at
2px offset. **Never remove an outline without adding this.** The dark rail uses a light
ring against the sidebar ground instead, since the ink ring disappears there.

---

## Primitives

`components/admin/ui/`. No primitive fetches data, none imports from `lib/supabase`, and
each reads only tokens.

| Component | Responsibility |
|---|---|
| `PageShell` | The container. Every admin page's outermost element. Takes no size prop. |
| `PageHeader` | `eyebrow`, `title`, `badge`, `subtitle`, `actions`. Owns header layout and action alignment. Strips terminal periods. |
| `Button` | `variant` primary / secondary / ghost, `size` default / sm. All pills. |
| `Card` | `padding` default / compact / flush, `interactive`. Background, border, radius, shadow. |
| `StatRow` | `{ label, value, hint?, href? }[]`. One layout for every page. |
| `FilterTabs` | Segmented control with counts. |
| `SearchInput` | Icon plus input. |
| `DataTable` | Header, rows, empty state. Owns column alignment, `ariaSort`, `rowHref`, `rowClassName`. |
| `EmptyState` | Renders **once**, inside the container it belongs to. |
| `Badge` | Count and status pills. |
| `StatusDot` | The live dot. |

**Props over variants-by-copy.** If two pages need two looks, that is a prop, not a
second component.

### `lib/format.ts`

One `formatRelativeTime` for every timestamp in admin, with an explicit gapless ladder:
`Just now` → `Nm` → `Nh` → `Yesterday` → `Nd` (<7) → `Nw` (7–27d) → `Nmo` (28d+) → `Ny`.
No value is expressible in two units. `{ seconds: true }` opts into a sub-minute band
for the Live board.

`EMPTY_VALUE` is the single empty-cell glyph. Import it; never type the character.

---

## Standing rules

- Never invent a design token. If a needed value is not in `tokens.css`, stop and ask.
- Never write a raw hex, font size, or radius in a component.
- Never build a one-off card, button, or header. Extend a primitive or ask.
- No em dashes. No beige. No cream.
- Every new admin page starts from `PageShell` plus `PageHeader`.
- Check `/admin/styleguide` before adding any UI.

> On rule 1: this codebase keeps its tokens in `app/globals.css` rather than a separate
> `tokens.css`, because `tailwind.config.ts` maps every Tailwind colour name onto those
> variables and a second file would double-define `--ds-border` and silently fork the
> palette. Read "tokens.css" as "the token block in `app/globals.css`".

**Two documented exceptions to the no-em-dashes rule**, both typographic marks rather
than prose:

1. `EMPTY_VALUE` in `lib/format.ts` — the empty-cell glyph.
2. `ReportSection.tsx`'s markdown export — the quote-attribution dash in
   `> "quote" — Attribution`. Replacing it with a comma is worse typography, and the
   string is generated file content, not UI chrome.

Comments are not copy. The rule governs user-visible prose.

---

## Changelog

### Design system unification (this pass)

Every admin page re-derived its own type scale, container width, card treatment, button
shape and stat layout, because each was built in a separate session. This pass created
one source of truth and moved every page onto it.

**Resolved conflicts**

| Was | Now |
|---|---|
| Two containers, 920px and 1140px | One, 1140px |
| Nine button shapes, two radii, five heights | Three variants, two sizes, all pills |
| Four stat patterns | One `StatRow` |
| Two table treatments (one not even a `<table>`) | One `DataTable` |
| Live dot in three colours | One `StatusDot` |
| The Live page printing its empty state twice | Once, from `EmptyState` |
| No focus style on 27 files' worth of controls | One rule, applied everywhere |
| Two relative-time formatters | One |

**Decisions where the brief left a choice**

- **`StatRow` is the joined segmented bar**, applied everywhere, replacing all four
  existing stat patterns. Why the bar and not the detached cards, recorded verbatim:
  *It is the only one that survives a variable stat count without leaving a hole.
  Surveys hid its third card and Home collapsed its report card, both working around a
  fixed grid; the bar just has fewer cells. At 1140px, three detached cards give each
  stat ~350px of width to hold a 32px numeral, which is most of why Surveys and Leads
  read as different products sitting next to each other. Borders do the dividing rather
  than gaps, so it reads as one ruled object rather than as three things that happen to
  be adjacent.*

- **`--ds-border` is unchanged at `#e7e5e4`.** The brief asked to reconcile `#e5e7eb`
  against `#e7e5e4`. **`#e5e7eb` never existed in this codebase** — not in a component,
  not in the stylesheet, not in the Tailwind config. There was nothing to reconcile; the
  border was already uniform. Recorded so a future session does not go looking for it.

- **`--ds-accent-live` is `#3a6046`, not the `#8fbf7a` it replaces.** That literal
  appeared in five files and was never a token. It measures **1.9:1 against the card
  surface**, which is not legible for a 7px mark carrying real state, so it was not
  worth preserving for continuity. The Live board's separate `indigo-light` dot maps
  here too, so "live" is now one colour across the whole surface rather than three.

- **Radius stays 12px and the container stays 1140px**, both the values already in use,
  overriding the brief's 16px and 1160px. The goal is consistency, not a redesign; those
  two values were already consistent and changing them would be churn on pages that were
  already correct. Container padding stays 32px horizontal for the same reason.

- **The type scale was applied as briefed: H1 44px, subhead 17px**, up from 40px and
  15px. These were also already consistent, but they are a deliberate scale rather than
  an artifact of drift, so they were not rolled back with the radius and container.

- **Four named font-size steps were added** (`micro` / `count` / `control` /
  `display-sm`, later joined by `nav` / `wordmark`) during the Company profile refactor.
  They exist because a control needs a size without inheriting a colour and a line
  height, which the `.type-*` roles carry. They are real tokens, documented above, not a
  workaround for the greps.

- **Fonts are Young Serif (display) and Archivo (body).** Not Inter. Any earlier
  documentation saying otherwise was stale.

- **`components/ui/{button,card,badge}.tsx` are intentionally forked** from
  `components/admin/ui/*`. See "Import boundaries" above for the rule and the reason.

**Naming decision, not a style fix**

- **The Settings eyebrow reads `ACCOUNT`, not `SETTINGS`.** Every other eyebrow on the
  surface is the sidebar nav label for that page. Settings has no nav item — it is
  reached from the sidebar account menu — so there was no label to mirror, and its
  eyebrow previously just repeated its own H1 verbatim. `ACCOUNT` names the menu the
  page belongs to. This is a naming judgement about that specific page, **not** a
  general licence to invent eyebrow text: every page that *does* have a nav item must
  use that item's label.

**Palette reversal**

- **`LiveTranscript` no longer mirrors the respondent survey's palette.** It previously
  hardcoded the interview's hex values so an admin saw roughly what the respondent saw.
  That copy brought a cream ground with it, which this system bans, and an admin page
  painting itself from a second surface's colours is exactly the drift this pass
  removes. The resemblance was never carried by the hex values: the asymmetric bubble
  tails, the left/right split and the accent on the respondent's own words all survive
  in admin tokens. If the mirror is ever wanted back, it should import `--sv-*` under a
  scoped class, not copy literals.

- **The Home report card no longer borrows `--lp-butter-*`** from the marketing palette.
  Same reasoning: the fill is a cream, and reaching across surfaces was the wrong escape
  hatch. The card now reads as distinct through the accent tint and its sticker.

- **Survey card covers dropped six invented three-stop gradients** for three flat token
  fills. Two of the six ("sand", "blush") were the tan and cream this system bans, and a
  gradient invented per card is not a design system.

- **The sidebar account avatar is the Birdsong mark**, replacing an eight-point star
  clipped out of a flat periwinkle (`#8ea4e8`) that appears nowhere else in the product.
  The adjacent note glyph was orange (`#e9a674`), equally off-palette. Six rgba literals
  on the workspace plate became `--ds-sidebar-plate` / `-label` / `-muted`.
