# Birdsong Design System: Ledger II

**`app/globals.css` is the single source of truth. This document is a human-readable
mirror of it.** Where the two disagree, the stylesheet wins and this file is out of
date.

`/admin/styleguide` renders the whole system live. Check it before adding any UI. The
design reference it was built from is `design/design-system/` (brand book and
`tokens.json`) and `design/mockups/`.

Light, dense, CRM-style. Manrope for every word, IBM Plex Mono for every number, slate
text, one teal accent, borders instead of shadows, 10px controls and 14px cards instead
of pills.

## Scope

| Surface | Design system | Tokens |
|---|---|---|
| **Admin** (`app/admin/**`, `components/admin/**`, the shell) | This document | `--ds-*` under `.admin-theme` |
| Respondent study (`app/study/[slug]`) | Its own, light and dark | `--sv-*` |
| Marketing (`app/page.tsx`, `app/customer-success`, `/terms`, `/privacy`) | Its own | `--lp-*`, `--ln-*`, `--hp-*` |
| Auth screens (login, signup, forgot and reset password) | Its own | Local literals |

The last three are out of scope for this document, and admin must not reach across into
their tokens. Single light theme for admin. No dark mode.

### Why the tokens are scoped, not global

The Ledger II block lives under **`.admin-theme`**, not `:root`. `AdminShell` sets that
class on its root element, and on `<body>` while it is mounted so portalled dialogs
resolve the same values.

`:root` still holds the previous `--ds-*` values, unchanged. They are not admin's any
more. They stay because `tailwind.config.ts` maps its colour names onto `--ds-*` and
three non-admin surfaces still render through those names: the respondent interview
(`bg-primary`, `border-input`), the bare auth screens (`.focus-ring`, `components/ui`)
and the public report blocks. Changing a `:root` value restyles those, not admin.

### Colours are HSL triplets

`tokens.json` gives hex. The stylesheet stores the same colours as space-separated HSL
triplets, because `tailwind.config.ts` wraps every `--ds-*` colour as
`hsl(var(--x) / <alpha-value>)` and several Ledger names (`border`, `accent`,
`accent-weak`, `muted`) are names it already consumes. Write `hsl(var(--ds-ink))`.

---

## Import boundaries

```
admin pages, admin components   ->  components/admin/ui
respondent study, marketing     ->  components/ui
```

`components/ui/{button,card,badge}.tsx` and `components/admin/ui/{Button,Card,Badge}.tsx`
are intentionally forked. **Neither side edits the other's copy.**

---

## Fonts

| Role | Face | Variable |
|---|---|---|
| Display and body | **Manrope**, 400 500 600 700 800 | `--font-display`, `--font-body` |
| Numbers | **IBM Plex Mono**, 400 500 | `--font-mono` |

Loaded in `lib/fonts.ts` as `manrope` and `plexMono`, applied at `AdminShell`. The role
variables exist only inside `.admin-theme`.

Scores, counts, timestamps, turn numbers and keyboard hints are mono. Everything else is
the sans. A number in the body face is a mistake; the one exception is the stat value,
which is a display number and is set in `.ds-stat`.

Inside `.admin-theme`, `--font-archivo` and `--font-young-serif` both point at Manrope,
so a page that still writes `font-archivo` renders the new face. Tailwind's `font-mono`
is overridden to `--font-mono` in the same scope.

`lib/fonts.ts` still exports `archivo`: it is the respondent study's body face. It also
exports `youngSerif` as an alias of `manrope`, because `app/layout.tsx` imports that
name.

---

## Color

### Grounds and hairlines

| Token | Value | Where |
|---|---|---|
| `--ds-bg` | `#ffffff` | Pages and cards. Cards sit on it with a border |
| `--ds-bg-sidebar` | `#f8fafc` | Sidebar, table header rows, tinted panels inside cards |
| `--ds-bg-track` | `#f1f5f9` | Segmented track, fit chip, progress track, muted badge |
| `--ds-border` | `#e2e8f0` | Every hairline |
| `--ds-border-dashed` | `#cbd5e1` | Dashed borders only |

One dark ground, `--ds-ink`, reserved for the worth-a-call card and the floating bar.

### Text

| Token | Value | Where |
|---|---|---|
| `--ds-ink` | `#0f172a` | Primary text, page titles. 15.4:1 on bg |
| `--ds-ink-2` | `#1e293b` | Quotes and transcripts |
| `--ds-ink-3` | `#334155` | Secondary button labels, non-primary cells |
| `--ds-muted` | `#475569` | Inactive nav, dashed-button labels |
| `--ds-muted-2` | `#64748b` | Labels, second lines, timestamps. The lightest text allowed at 12px |
| `--ds-muted-3` | `#94a3b8` | Placeholders and hints. Never information |

### Accent

| Token | Value | Where |
|---|---|---|
| `--ds-accent` | `#0f766e` | The one accent: primary buttons, live dots, active underline, score 9 |
| `--ds-accent-weak` | `#ddf3ef` | Tinted ground for accent text |
| `--ds-accent-bright` | `#5eead4` | Only on ink grounds: wordmark bars, avatar |
| `--ds-accent-soft` | `#99e6da` | Second segment of a stacked progress bar |

### Status, badges and dots only

| Token | Value |
|---|---|
| `--ds-status-new` / `-bg` / `-text` | `#4f46e5` / `#eef2ff` / `#3730a3` |
| `--ds-warn` / `-bg` / `-border` / `-text` / `-bg-badge` | `#d97706` / `#fffbeb` / `#fde68a` / `#92400e` / `#fef3c7` |
| `--ds-danger` | `#dc2626`, a dot, never a fill |
| `--ds-on-ink` / `--ds-on-ink-muted` | `#ffffff` / `#94a3b8` |

| State | Dot | Ground | Text |
|---|---|---|---|
| New | `status-new` | `status-new-bg` | `status-new-text` |
| Contacted | `muted-2` | `bg-track` | `ink-3` |
| Meeting | `warn` | `warn-bg-badge` | `warn-text` |
| In HubSpot | `accent` | `accent-weak` | `accent` |
| Live | `accent` | `accent-weak` | `accent` |
| Draft | `muted-3` | `bg-track` | `ink-3` |
| Failed | `danger` | none | inherits |

### Aliases

Names the pages and `tailwind.config.ts` still read, pointed at Ledger II so a page that
has not been migrated picks up the new system through its existing classes.

| Alias | Points at |
|---|---|
| `--ds-accent-text`, `--ds-accent-live`, `--ds-focus`, `--ds-ring`, `--ds-success` | `--ds-accent` |
| `--ds-cover-1` / `-2` / `-3` | `--ds-accent-weak` / `--ds-bg-track` / `--ds-bg-sidebar` |
| `--ds-page-background`, `--ds-card`, `--ds-popover` | `--ds-bg` |
| `--ds-foreground`, `--ds-card-foreground`, `--ds-popover-foreground` | `--ds-ink` |
| `--ds-muted-foreground` | `--ds-muted-2` |
| `--ds-faint` | `--ds-muted-3` |
| `--ds-chip`, `--ds-secondary` | `--ds-bg-track` |
| `--ds-surface` | `--ds-bg-sidebar` |
| `--ds-input` | `--ds-border` |
| `--ds-primary` / `-hover` / `-foreground` | `--ds-ink` / `--ds-ink-2` / `--ds-on-ink` |
| `--ds-destructive` | `--ds-danger` |
| `--ds-warning` / `-foreground` | `--ds-warn` / `--ds-warn-text` |
| `--ds-indigo`, `--ds-indigo-chip` | `--ds-status-new` |
| `--ds-sidebar-*` | The light sidebar's equivalents |

`--ds-primary` stays the ink fill it always named. The accent-filled primary button is
the `Button` primitive's own variant; pointing the alias at the accent would turn every
ink panel a page paints with `bg-primary` teal.

---

## Type

Utility classes in `app/globals.css`. They carry size, weight, line height and tracking,
never a colour.

| Class | Size / line height / weight / tracking | Where |
|---|---|---|
| `.ds-h1` | 30 / 1.1 / 800 / -0.03em | Page title. No subtitle under it |
| `.ds-h2` | 22 / 1.15 / 800 / -0.02em | Section title |
| `.ds-stat` | 24 / 1 / 800 / -0.03em | Stat row values |
| `.ds-card-title` | 17 / 1.25 / 800 / -0.02em | Card and study titles |
| `.ds-body` / `.ds-body-strong` | 14 / 1.5 / 400 or 700 | Running text |
| `.ds-row-primary` | 15 / 1.3 / 700 | A table's primary cell |
| `.ds-transcript` | 15 / 1.55 / 400 | Transcripts |
| `.ds-control` | 13 / 1 / 700 | Buttons, tabs, filter chips |
| `.ds-small` | 13 / 1.45 / 400 | Secondary running text |
| `.ds-caption` | 12 / 1.4 / 600 | Stat labels, second lines |
| `.ds-eyebrow` | 11 / 1 / 700 / 0.06em, uppercase | Section labels, in `muted-3` |
| `.ds-mono-chip` | mono 14 / 1 / 500 | Scores and fit |
| `.ds-mono-count` | mono 12 / 1 / 400 | Counts and timestamps |
| `.ds-mono-kbd` | mono 11 / 1 / 400 | Keyboard hints |
| `.ds-mono-hero` | mono 30 / 1 / 400 | Hero numbers |

**No H1 carries a terminal period.** `PageHeader` strips one structurally.

The older `.type-*` roles (`.type-page-title`, `.type-body`, `.type-meta` and the rest)
are still defined, re-cut onto this scale, because the pages reference them. They carry
a colour. New work uses `.ds-*`.

---

## Layout

| Token | Value | Where |
|---|---|---|
| `--ds-space-1` to `-8` | `4 8 12 16 20 24 28 32` | The 4px scale |
| `--ds-shell-sidebar` | `240px` | Sidebar width. Fixed |
| `--ds-shell-topbar` | `56px` | Top bar height |
| `--ds-control-h` | `34px` | Buttons and inputs in a bar or filter row |
| `--ds-row-h` | `60px` | Two-line table row. 54 one-line, 42 header |
| `--ds-container-max` | `none` | Pages use the full width; Home caps itself |

Content is padded 28px top and bottom, 32px at the sides, by `AdminShell`.

## Radius, shadow, timing, focus

| Token | Value | Where |
|---|---|---|
| `--ds-radius-chip` | `8px` | Chips, badges, nav items, small buttons |
| `--ds-radius-control` | `10px` | Buttons, inputs, the segmented track |
| `--ds-radius-card` | `14px` | Cards, tables, stat rows |
| `--ds-radius-hero` | `18px` | Home hero cards |
| `--ds-radius-pill` | `999px` | The floating bar only |
| `--ds-shadow-input` | `0 2px 8px rgba(15,23,42,.04)` | The launcher and chat inputs |
| `--ds-shadow-active-nav` | `0 0 0 1px #e2e8f0, 0 1px 2px rgba(15,23,42,.05)` | Active nav item, active segmented tab |
| `--ds-shadow-float` | `0 10px 30px rgba(15,23,42,.28)` | The floating bar only |
| `--ds-shadow-card`, `-card-hover` | `none` | Cards take a 1px `--ds-border` |
| `--ds-ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Every enter and grow |
| `--ds-duration-enter` | `550ms` | Card fade-up, staggered 80ms |
| `--ds-duration-count` | `900ms` | Number count-up |
| `--ds-duration-wave` | `1200ms` | Waveform loop while live |
| `--ds-duration-pulse` | `1800ms` | Live dot pulse |

**Focus.** One rule: `.focus-ring` gives `:focus-visible` a 2px ring in `--ds-accent` at
a 2px offset. Never remove an outline without adding this.

**Motion means live.** `.ds-wave-bar` and `.ds-pulse` run only on something that is live;
`.ds-enter` runs once per page load. All three are gated on
`prefers-reduced-motion: no-preference`.

---

## The shell

- **Sidebar** (`AdminSidebar`): 240px on `bg-sidebar` with a right border. Wordmark,
  search with a `⌘K` hint, the Workspace nav (Home, Live, Leads, Projects), Active
  studies with a plus, then the account row with a gear that opens Settings. The account
  name opens a menu for Company profile, Team and Sign out. Active item: `bg` ground,
  `shadow-active-nav`, `ink` at 700.
- **Top bar** (`AdminShell`): 56px, bottom border. Breadcrumb left, actions right. The
  shell derives a breadcrumb from the route; a page replaces it with `PageTopBar`.
- **Bare routes** (login, signup, forgot and reset password) get neither, and are outside
  `.admin-theme`. The list lives in `lib/admin-routes.ts`, shared with `middleware.ts`.

---

## Primitives

`components/admin/ui/`. No primitive fetches data, and each reads only tokens.
`tokens.ts` spells the Ledger II custom properties as class names, so no primitive
writes a colour, a radius or a shadow of its own.

| Component | Responsibility |
|---|---|
| `PageShell` | The container. Every admin page's outermost element |
| `PageHeader` | `eyebrow`, `title`, `badge`, `meta`, `subtitle`, `actions`. Strips a terminal period |
| `PageTopBar` | `crumbs`, `actions`. Renders into the shell's top bar |
| `Button` | `variant` primary / secondary / dashed / ink / ghost, `size` default (34px) / sm (30px), `kbd` |
| `Card` | `padding` default / compact / flush, `interactive`, `header`, `headerAction` |
| `StatRow` | `{ label, value, emphasis?, note?, delta?, href? }[]`. One joined bar |
| `FilterTabs` | Segmented control with counts, for one choice over a list |
| `SectionTabs` | Text tabs on a baseline, for the sections of a page |
| `Badge` | `state`: new, contacted, meeting, hubspot, live, draft, failed |
| `ScoreChip` | `score`, `variant` score / fit, `size` default / sm / hero |
| `SearchInput` | 34px, icon left, optional mono `hint` right |
| `DataTable` | Header, rows, frame, empty state, sorting, `rowHref`. `density` stacked (60px) / default (54px) |
| `StackedCell` | The two-line cell: primary over secondary, both ellipsized |
| `EmptyState` | One sentence, one optional action, no chrome |
| `StatusDot` | The live dot |
| `FloatingBar`, `FloatingBarButton` | The ink pill of actions. Exactly one `primary` |
| `Waveform` | `seed`, `bars`, `live`, `tone`. Deterministic from the seed |
| `RelativeTime` | Every timestamp a person reads, in mono |
| `CollapsibleSection` | Set-once configuration on a detail page |
| `ScoreBadge` | The older name for a lead `ScoreChip`. Kept for its call sites |

**Props over variants-by-copy.** If two pages need two looks, that is a prop, not a
second component.

`Badge` also still accepts `variant` with free-text children, for a count or a marker
the state table does not cover. A status passes `state`.

`ScoreChip` bands by fill: 9 and up takes the accent with white text, 7 and 8 take
`accent-weak` with accent text, below 7 takes `bg-track` with `ink-3`. 7 is the
threshold in `lib/leads.ts`. `variant="fit"` is always neutral.

`DataTable` holds no state: the admin home renders it from a server component. Sorting
lives in `useTableSort`, a client hook beside it. `density="compact"` is accepted and
renders as `default`; Ledger II has two row heights.

---

## Standing rules

- Never invent a design token. If a needed value is not in `app/globals.css`, stop and
  ask.
- Never write a raw hex, radius or shadow in a component. Use `tokens.ts`, a `--ds-*`
  property or a `.ds-*` utility.
- Never build a one-off card, button or header. Extend a primitive or ask.
- Banned on admin surfaces: beige, cream, gradients, blobs, pill buttons (other than the
  floating bar), left-border cards, a second accent.
- Every new admin page starts from `PageShell`.

### Copy

- Plain and short. No em dashes in any user-visible string.
- The word "survey" is banned in user-visible copy. "Study" for one, "Projects" for the
  section.
- Nothing respondent-facing mentions leads, scores or sales.
- Stat labels are nouns, two words: "Worth a call", "Unworked", "Meetings booked".
- Buttons are verbs: "Push to HubSpot", "Copy call script".
- No subtitles under page titles. If a sentence explains a control, the control is wrong.

`EMPTY_VALUE` in `lib/format.ts` is the single empty-cell glyph. Import it; never type
the character. Comments are not copy.
