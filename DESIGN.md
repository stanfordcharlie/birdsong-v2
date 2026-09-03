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
| `--ds-container-pad-y` | `32px` | Viewport top to the page title (was 56) |
| `--ds-rhythm-header` | `32px` | Page header to first content block |
| `--ds-rhythm-block` | `40px` | Between major content blocks. Pages currently use 32 (`gap-8`); the token stays as the ceiling |

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
| `.type-eyebrow` | 12 / 1.2 / 0.08em, uppercase | 600 | The parent-object line above a detail page's H1; section labels on a page |
| `.type-page-title` | 30 / 1.15 / -0.015em, Young Serif | 400 | The one H1 per page. Was 44; this is the only line to change if it is ever reverted |
| `.type-subhead` | 17 / 1.5, `max-width: 52ch` | 400 | A sentence under an H1. Defined, but no page passes one after the density sweep |
| `.type-section-label` | 13 / 1.2 / 0.06em, uppercase | 600 | A label over a card or section |
| `.type-table-head` | 12 / 1.2 / 0.06em, uppercase | 600 | Table headers, field labels |
| `.type-metric-value` | 24 / 1.1, `tabular-nums` | 500 | Every stat value. Was 32 |
| `.type-metric-label` | 14 / 1.4 | 400 | Retained; `StatRow` now labels in `text-micro` |
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
| `text-micro` | 11.5px | Stat labels and deltas, small badges |
| `text-count` | 12px, tabular figures | Counts beside a filter tab, the study chips |
| `text-control` | 13px, tabular figures | Small buttons, badges, chips |
| `text-nav` | 15px | Sidebar nav items only |
| `text-wordmark` | 21px | Sidebar wordmark only |
| `text-account` | 12.5px | Sidebar account name only |
| `text-role` | 10.5px | Sidebar account role line only |
| `text-display-sm` | 28px | Setup-wizard step titles only |

**`text-count` and `text-control` carry `font-variant-numeric: tabular-nums`**, set in
`app/globals.css` beside the type roles because a `fontSize` tuple cannot express it. Every
`DataTable` cell also carries tabular figures.

**Every custom key here must also be registered in `lib/utils.ts`.** `tailwind-merge`
only knows Tailwind's stock scales; an unregistered `text-*` is misread as a *colour*,
lands in the same conflict group as the real colour beside it, and one of the two is
silently deleted. `lib/utils.test.ts` guards it. The same applies to custom radius,
shadow and max-width keys.

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
| `--ds-chip` | `#edece8` | `bg-chip` | Neutral chip fill, the code block, the segmented control track |
| `--ds-secondary` | `#edece8` | `bg-secondary` | Row hover only. No quote block or transcript carries a fill |
| `--ds-border` | `#e7e5e4` | `border-border` | Card outlines, table row rules, section rules, the left rule on a quote |

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
| `--ds-accent` | `#3a6046` | `bg-brand` / `text-brand` | The accent. At most one instance per visible region |
| `--ds-accent-weak` | `#e4ecdd` | `bg-brand-weak` | Tinted fill behind a 7+ `ScoreBadge` |
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

### Sidebar

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--ds-sidebar` | `#121212` | `bg-sidebar` | The rail ground |
| `--ds-sidebar-accent` | `#262626` | `bg-sidebar-accent` | Nav hover and active fill |
| `--ds-sidebar-foreground` | `#9aa1ac` | `text-sidebar-foreground` | Inactive nav text |
| `--ds-sidebar-active-foreground` | `#ffffff` | `text-sidebar-active-foreground` | Active nav, account name |
| `--ds-sidebar-plate` | `#fffdf7` | `bg-sidebar-plate` | Account plate fill (3%), its edge (6%), hover/open fill (6%) |
| `--ds-sidebar-label` | `#6b6b6b` | `text-sidebar-label` | The "Workspace" section label |
| `--ds-sidebar-muted` | `#f3ecdf` | `text-sidebar-muted` | Account role line, at 38% |
| `--ds-sidebar-avatar` | `#5f6bab` | `bg-sidebar-avatar` | Account avatar squircle |
| `--ds-sidebar-avatar-foreground` | `#fffdf7` | `text-sidebar-avatar-foreground` | Account avatar initials |

---

## Radius, elevation, focus

| Token | Value | Where |
|---|---|---|
| `--ds-radius-control` | `8px` | Inputs, selects, small chips |
| `--ds-radius-account` | `11px` | The sidebar account row, and only that |
| `--ds-radius-card` | `12px` | Every card and panel |
| `--ds-radius-pill` | `999px` | Every button, badge, dot, meter |
| `--ds-shadow-card` | `0 4px 14px rgba(28,25,23,.06)` | The one card elevation. `Card` only; tables and `StatRow` carry none |
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
| `PageHeader` | `eyebrow` (detail pages and the two account pages only), `title`, `badge`, `meta` (one line of fact), `subtitle` (rare), `actions`. Actions centre on the title row. Strips terminal periods. |
| `Button` | `variant` primary / secondary / ghost, `size` default / sm. All pills. |
| `Card` | `padding` default / compact / flush, `interactive`. Background, border, radius, shadow. Never inside another Card. |
| `StatRow` | `{ label, value, delta?, href? }[]`. One vertical stack per cell. Four per page at most. |
| `FilterTabs` | Segmented control with counts. |
| `SearchInput` | Icon plus input. |
| `DataTable` | Header, rows, frame, empty state. Owns alignment, density, width, truncation, sorting, `rowHref`. Draws its own frame; never wrapped in a Card. |
| `EmptyState` | One sentence, one optional action, no chrome. Renders **once**. |
| `Badge` | Count and status pills. |
| `StatusDot` | The live dot. |
| `ScoreBadge` | Every lead score. One encoding, four states. |
| `RelativeTime` | Every timestamp a person reads. |
| `CollapsibleSection` | Set-once configuration on a detail page. |

**Props over variants-by-copy.** If two pages need two looks, that is a prop, not a
second component.

### `ScoreBadge`

`score` (nullable) and `size` (`md` 28px / `sm` 24px). The number always renders, in
tabular figures, inside a pill. **7 to 10** takes `--ds-accent-weak` on
`--ds-accent-text`; **5 to 6** and **1 to 4** both take the neutral `--ds-chip` fill
with `--ds-muted-foreground`, which is `Badge`'s default variant; **null** renders
`EMPTY_VALUE` in muted text with no fill. Only 7+ carries the accent, because 7 is the
threshold the Slack notification, the HubSpot deal rule and "worth a call" all act on;
below it the digit is the distinction, and a third fill would be colour for its own
sake. `aria-label` is always `Lead score N of 10`, or `No lead score yet`.

This replaces the Leads queue's 26px meter bar and the study page's flat grey pill. A
bar beside a number is a second reading of the number, and it cost the Score column
26px of width to say the same thing twice.

### `RelativeTime`

`date` and `align`. Renders `<time dateTime>` whose visible text is
`formatRelativeTime` and whose `title` is the full absolute stamp. **Relative is the
only visible timestamp format in admin**; the absolute value lives in the tooltip. A
`prefix` renders a muted qualifier ("started") for a row whose stamp does not mean what
the column header says.

### `CollapsibleSection`

`title` (eyebrow), `summary`, `action`, `defaultOpen`, `children`. A 48px header row
that is one full-width disclosure button, a chevron on the right that rotates in 150ms,
and 16px of body padding on top with no horizontal padding of its own — the parent
`Card` owns the inset. Sections stack inside one `Card`, separated by the `--ds-border`
hairline.

The summary is the point of the collapsed state: a disclosure that shows only its own
title makes you open it to find out whether it is worth opening. `action` is a **sibling
layered over** the header button, never a child, because a button inside a button is
invalid markup and would not receive its own clicks.

### `DataTable`

Beyond header/rows/empty state it now owns:

| Prop | Meaning |
|---|---|
| `density` | `default` rows are `h-12` (48px), `compact` `h-10` (40px). Header is `h-9`. Cell padding is `px-3`. |
| `layout` | `fixed` makes declared widths authoritative. Required for a truncating column. |
| `stickyHeader` | Default on. Header sticks to its scroll container on the card fill. |
| `sort` / `onSort` | Sort state, rendered as a chevron in the header. |
| `empty` | `{ title, action? }`. With no rows the table renders `EmptyState` bare: no column headers, no frame. |
| Column `width` | A named step `xxs` / `xs` / `sm` / `md` / `lg` (`w-10` / `w-16` / `w-24` / `w-32` / `w-44`) or a fraction below 1 (`0.28`). `xxs` is for a bare checkbox. No px strings. |
| Column `truncate` / `title` | One line, ellipsis, full value on the cell's `title`. |
| Column `sortable` / `sortValue` | Client-side sort over loaded rows. Nulls always last, both directions. |
| Column `align` | `left` / `right` / `center`. Numbers and times go right. Every cell carries tabular figures. |
| Column `rowLabel` | The column that underlines on row hover. Defaults to the first; set it when the first column is a checkbox. |

Row rules are a single hairline in `--ds-border`. No zebra striping. The frame (card surface,
hairline, radius, no shadow) is drawn by the table itself, only while it has rows.

**`DataTable` holds no state**, deliberately: the admin home renders it from a server
component, where a `useState` would be a hard error and its `cell` functions cannot
cross the boundary at all. Sorting lives in `useTableSort`, a client hook in the same
folder, which hands back the `sort`/`onSort` pair the table renders.

A whole row is a link via `rowHref`; the first cell underlines on row hover. The link is
stretched across the row underneath the cells, and cell content is click-through, so a
click anywhere in the row — on the name, not just the padding around it — navigates.
Interactive elements inside a linked row (a select, a button, a nested link) keep their
own pointer events and go on working; the pattern is on `/admin/styleguide` under
"DataTable states".

### `lib/format.ts`

One `formatRelativeTime` for every timestamp in admin, with an explicit gapless ladder:
`Just now` → `Nm` → `Nh` → `Yesterday` → `Nd` (<7) → `Nw` (7–27d) → `Nmo` (28d+) → `Ny`.
No value is expressible in two units. `{ seconds: true }` opts into a sub-minute band
for the Live board. `formatAbsolute` (date and time, no seconds) is the tooltip half of
`RelativeTime`; `formatDayMonth` is the short stamp on a generated report. **No admin
file calls `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString` directly.**

`EMPTY_VALUE` is the single empty-cell glyph. Import it; never type the character.

### `lib/leads.ts`

`isWorthACall` / `countWorthACall` / `WORTH_A_CALL_SCORE_MIN`. The one definition of
"worth a call": a completed response scoring 7 or higher that nobody has moved off
`new`. The Leads page's survey cards and the study detail page's stat both call it, so
they cannot describe the same study differently again.

---

## Standing rules

- Never invent a design token. If a needed value is not in `tokens.css`, stop and ask.
- Never write a raw hex, font size, radius or px value in a component. Sizes come from the
  Tailwind scale (`h-12`, `w-24`), the `--ds-*` tokens or a named type utility.
- Never build a one-off card, button, or header. Extend a primitive or ask.
- No em dashes. No beige, cream, tan, warm-neutral fill or gradient.
- Every new admin page starts from `PageShell` plus `PageHeader`.
- Check `/admin/styleguide` before adding any UI.

### Copy

- Facts, not situations. A subhead or meta line states a count, a date, a parent name or a
  constraint. Never "N leads finished interviews and none of them have heard back yet".
- No eyebrow on a top-level page: the sidebar states the location. An eyebrow appears on a
  detail page, naming the parent object, and on Settings and Company profile ("Account"), which
  have no nav item.
- Empty states are one sentence and at most one action, with no chrome around them.
- A description under a card or field survives only if it states a rule the user can break or
  a consequence they cannot predict.
- Button labels are verb plus noun, three words at most. Sentence case everywhere except the
  eyebrow utility and table column headers. No over-affirmation, no "AI agent" phrasing.
- A label removed visually that carried meaning survives as `aria-label` or `sr-only`.

### Density

- Status renders once per row or block: dot plus text in tables, a neutral badge on detail
  pages. Never a dot, a label, a badge and a tinted fill for one state.
- Borders only on interactive surfaces and table row rules. Where whitespace already separates
  two blocks, there is no border. Sections on a detail page are a hairline top rule and an
  eyebrow, not a Card.
- Quotes and transcripts take a left hairline in `--ds-border`, never a filled background.
- The accent appears at most once per visible region. Count badges and section pills are
  neutral.
- A stat value is a number, a percentage or a duration. Nothing sits inline beside it.
- Titles in list rows truncate to one line with the full value on `title`.

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

## Decisions log

Newest first. One line each, dated. A decision lands here when a future session would
otherwise have to re-litigate it.

- **2026-09-02** — **The study list is a `DataTable`, not a card grid.** The covers carried one
  status pill across roughly 150px of tinted fill in three hues that meant nothing, the
  sparkline read as a broken graphic, and the avatar cluster belonged on the detail page.
  `--ds-cover-1/2/3` are removed rather than left defined. If cards ever return they are
  coverless, untinted and sized to their content.
- **2026-09-02** — **`StatRow` is a vertical stack per cell** (`label`, `value`, `delta?`).
  `hint` (inline beside the number) and `sub` are gone: an inline hint had no shared baseline
  with the number, and a wrapping string was being passed as a value. "Best performer" was cut
  for the same reason: a stat value is never a name.
- **2026-09-02** — **`.type-metric-value` is 24px, not 32.** The brief asked for the stat number
  in the `count` size; at 12px the number would be indistinguishable from its label, so the
  metric role was kept and reduced instead. Recorded as a judgement call.
- **2026-09-02** — **`DataTable` draws its own frame and renders `EmptyState` bare when empty.**
  A Card around a table existed only to frame it, and framed an empty table's column headers
  around nothing. The frame carries no shadow.
- **2026-09-02** — **Column widths are named steps (`xs` / `sm` / `md` / `lg`), not px
  strings**, so no component writes a px value. Fractions remain for fluid columns.
- **2026-09-02** — **The H1 is a plain page title.** Home lost its time-of-day greeting; it was
  the largest element on the page and carried no information. Top-level pages carry no eyebrow.
- **2026-09-02** — **Company profile carries the "Account" eyebrow, like Settings.** Both are
  reached from the sidebar's account menu and neither has a nav item; the brief named only
  Settings, and the same reasoning covers both.
- **2026-09-02** — **The Studies page H1 reads "Projects"**, matching the sidebar nav label that
  was deliberately renamed in the unification pass. The object is still called a "study" in
  every action and count; only the nav word and its page title say "Projects".

- **2026-08-30** — `ScoreBadge` tiers are 7 to 10 accent (`--ds-accent-weak` /
  `--ds-accent-text`), 5 to 6 and 1 to 4 both neutral (`--ds-chip` /
  `--ds-muted-foreground`), null as `EMPTY_VALUE`: only the 7+ threshold the rest of the
  product acts on earns a colour, and no new token was added for a band the digit
  already distinguishes.
- **2026-08-30** — The study detail stat reads **"Worth a call"**, not "Qualified
  leads", and calls `lib/leads.ts`: `qualified` is a manual status a human sets after
  reading a transcript and cannot double as a score threshold, which is why a study
  scoring 9, 9, 8, 7 read "Qualified leads: 0" beside the Leads page's "6 worth a call".
- **2026-08-30** — **Relative time is the only visible timestamp format in admin.** The
  absolute stamp lives in `RelativeTime`'s `title` and `dateTime`. A column asks how
  stale a row is; it does not ask for a date.
- **2026-08-30** — **Set-once configuration on a detail page is collapsed by default**,
  in `CollapsibleSection`s inside one `Card`, each carrying a one-line summary. The
  study's audience, questions and respondent fields are read at setup and then never
  again, and expanded they pushed the responses the page exists to show below the fold.
- **2026-08-30** — `DataTable` **holds no state**: the admin home renders it from a
  server component. Sorting is `useTableSort`, a client hook beside it, not `useState`
  inside the primitive.
- **2026-08-30** — The Leads queue's "Show test" chip became **"Include test responses"
  inside the sources select**. It switches which rows exist, not which leads are hot,
  and it was the third most prominent control on the page.
- **2026-08-30** — A column that is the same glyph on every row is **not rendered**:
  Fit is hidden until something in scope has a fit score, and Study is hidden while a
  single study card is selected.

---

## Changelog

### Density and copy reduction sweep (2026-09-02)

The admin surface read text-heavy, vertically loose and decorated. This pass removed copy,
removed decoration and compressed structure. No features were added and no new visual
language was introduced.

**Tokens changed**

| Token or role | Was | Now |
|---|---|---|
| `.type-page-title` | 44 / 1.05 / -0.02em | 30 / 1.15 / -0.015em |
| `.type-metric-value` | 32 | 24 |
| `--ds-container-pad-y` | 56px | 32px (`.admin-container` no longer adds `pt-6`) |
| `text-count`, `text-control` | size only | size plus `tabular-nums` |
| `--ds-cover-1/2/3` | three cover fills | removed, with `bg-cover-*` in `tailwind.config.ts` |

**Primitives changed**

- `PageHeader`: title row with actions centred on it, one `meta` line. `subtitle` survives but
  no page passes one.
- `StatRow`: `{ label, value, delta?, href? }`, vertical stack per cell, no shadow.
- `DataTable`: `h-12` / `h-10` rows, `h-9` header, `px-3` cells, `--ds-border` row rules,
  tabular figures on every cell, named widths, `rowLabel`, its own frame, bare `EmptyState`.
- `EmptyState`: one sentence and one optional action. No `description`.
- `StatusDot`: `h-2 w-2`.

**Decoration removed**

- Study card covers, sparklines, avatar clusters and the card grid itself.
- Home's greeting, mascot, quiet-state bird, report sticker card, progress bars and arrow glyphs.
- The lead queue's avatar initials and the share meter on the study chips.
- The Live board's question progress bar, the Live transcript's filled ground and bubbles.
- Every Card on Response detail and Settings; every filled quote block.
- Icon-plus-label buttons on Company profile.

**Copy**

- Every subhead deleted. Every top-level eyebrow deleted. Every empty state reduced to one
  sentence. Button labels to verb plus noun.

### Design system unification

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

- **The sidebar account avatar is the account holder's initials on an indigo
  squircle** (`--ds-sidebar-avatar`, `#5f6bab`). This reverses an earlier decision in this
  same changelog, deliberately and with a reason: that pass replaced a periwinkle star
  with the Birdsong mark on the grounds that the hue appears nowhere else in the
  product, which was true. But the mark identifies the *product*, not the person whose
  name it sits beside — and it was a duplicate of the mark already 200px above it on the
  same rail. A dark tile on a near-black rail also reads as a smudge. Initials need a
  fill that separates them from the sidebar, so the rail carries exactly one saturated
  colour, here and nowhere else. The adjacent note glyph was orange (`#e9a674`), equally
  off-palette, and is gone with the row that held it. Six rgba literals on the workspace
  plate became `--ds-sidebar-plate` / `-label` / `-muted`.

  The 28px periwinkle circle it replaces was the loudest thing on a dark rail; the
  30px squircle also echoes the logo mark's geometry at the top of the same rail
  (30px, `rounded-control`), so the two reference each other instead of competing.

- **The account row is one quiet plate, with no divider above it.** A full-width
  hairline across the rail read as a seam cutting the panel in half, so it is gone;
  the plate's own edge (`--ds-sidebar-plate` at 6%) does the separating, over a 3%
  fill that lifts to 6% on hover and while the menu is open. The bordered, *shadowed*
  card this is not — that earlier treatment read as a button and spent width on
  chrome; this one is an edge and two percentage points of fill.

- **The account name is Archivo 12.5px/600, not Spectral 13.5px**, with the role line
  at 10.5px/500 and 38% opacity — a tight two-line block the height of the avatar.
  A serif at that size in a 240px rail read oversized and soft next to the sans nav
  directly above it. The handoff called for Inter; admin's body sans is Archivo and
  the rail should not carry a third face, so it is Archivo at the handoff's metrics.

- **One caret, not an up/down stepper.** The row opens a menu, it does not step through
  values: a single 12px chevron, pointing down at rest and flipping up while the menu
  is open.

- **The "Listening · N live" row is gone**, and with it the pulsing dot and the bobbing
  note. It was the rail's only live readout, and it cost a `surveys` count query on every
  admin page load; the same information is on Home and the Surveys page.
