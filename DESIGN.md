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

Manrope and IBM Plex Mono are the only two faces in admin. Nothing else loads or renders
on this surface.

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

The `Badge` states, all eleven. The label comes from the state, never from the call site.

| `state` | Label | Dot | Ground | Text |
|---|---|---|---|---|
| `new` | New | `status-new` | `status-new-bg` | `status-new-text` |
| `assigned` | Assigned | `muted-2` | `bg-track` | `ink-3` |
| `contacted` | Contacted | `muted-2` | `bg-track` | `ink-3` |
| `nurture` | Nurture | `muted-2` | `bg-track` | `ink-3` |
| `meeting` | Meeting | `warn` | `warn-bg-badge` | `warn-text` |
| `qualified` | Qualified | `accent` | `accent-weak` | `accent` |
| `disqualified` | Disqualified | `muted-3` | `bg-track` | `ink-3` |
| `hubspot` | In HubSpot | `accent` | `accent-weak` | `accent` |
| `live` | Live | `accent` | `accent-weak` | `accent` |
| `draft` | Draft | `muted-3` | `bg-track` | `ink-3` |
| `failed` | Failed | `danger` | none | inherits |

`LEAD_STATUS_BADGE_STATE` maps each lead status to its state. An archived study has no
state: it is `<Badge variant="outline">Archived</Badge>`.

A status inside a table row is lighter than a badge: a 6px dot and a 12px/700 label on
no ground (the study page's Status column).

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

Content is padded 28px top and bottom, 32px at the sides, by `AdminShell`. Home adds
12px and 16px of its own to reach 40px and 48px, and caps its content at 1080px.

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
a 2px offset. Never remove an outline without adding this. Nothing in admin draws a ring
or an outline on `:focus` alone (`.admin-theme :focus:not(:focus-visible)` clears it), and
a sidebar link clicked with the pointer gives its focus up, so the active item never
picks up a ring from the next key press.

## Motion

Motion means live. The resting state of every element is its final frame, and every
animation class is bound only inside `@media (prefers-reduced-motion: no-preference)`,
so reduced motion shows the final state with nothing moving.

| Class | Keyframes | Timing | Where |
|---|---|---|---|
| `.ds-enter` | `ds-enter`, fade up 10px | `--ds-duration-enter`, `--ds-ease-out` | Cards on page load, once. Stagger with `--ds-enter-delay`, 80ms per card in reading order |
| `.ds-ring-draw` | `ds-ring-draw`, dashoffset from `--ds-ring-length` | `--ds-duration-count`, `--ds-ease-out` | The worth-a-call ring. Shares its card's `--ds-enter-delay` |
| `.ds-wave-bar` | `ds-wave`, scaleY 25% to 100% | `--ds-duration-wave`, per-bar `--ds-wave-delay` | `Waveform` with `live` |
| `.ds-pulse` | `ds-pulse`, a ring out to 6px | `--ds-duration-pulse` | `StatusDot` with `pulse` |

Home is the page that uses all four: the greeting, the worth-a-call card, Needs you and
Live now enter at 0, 80, 160 and 240ms; the ring draws in and the card's four figures
count up together over `--ds-duration-count`; the Live now dot pulses and the row
waveforms breathe only while an interview is running. The count-up is the one piece
driven by script (`app/admin/HomeWorthACall.tsx`). It reads `--ds-duration-count`, renders
the final numbers on the server, and does not start at all under
`prefers-reduced-motion: reduce`.

No hover motion beyond colour. No transitions on layout.

---

## The shell

- **Sidebar** (`AdminSidebar`): 240px on `bg-sidebar` with a right border. Wordmark,
  search with a `⌘K` hint, the Workspace nav (Home, Live, Leads, Projects), Active
  studies with a plus, then the account row with a gear (Lucide `Settings`, 16px, 1.5px
  stroke) that opens Settings. The account name opens a menu for Company profile, Team
  (both Settings sections) and Sign out. Active item: `bg` ground, `shadow-active-nav`, `ink` at 700, and no
  outline or border of its own.
- **Top bar** (`AdminShell`): 56px, bottom border. Breadcrumb left, actions right. The
  shell derives a breadcrumb from the route; a page replaces it with `PageTopBar`.
- **Bare routes** (login, signup, forgot and reset password) get neither, and are outside
  `.admin-theme`. The list lives in `lib/admin-routes.ts`, shared with `middleware.ts`.

## Page anatomy

- **Home:** greeting, the study launcher (one 56px input on `radius-card` with
  `shadow-input`), the worth-a-call card beside Needs you, then Live now. Nothing else.
- **Leads:** stat row, segmented tabs and filters on one line, the full-width table,
  the floating bulk bar.
- **Lead detail:** score tile, name, section tabs, transcript left, details right, the
  floating action bar.
- **Projects:** title beside the search field, tabs, a three-column grid of study cards
  (112px flat cover with the study's waveform, `accent-weak` live and `bg-track` draft),
  archived studies as 64px rows, a dashed New study card.
- **Study detail:** title with its badge and a meta line, stat row, section tabs with the
  search field and a toggle at the right end, the responses table beside the Interview
  quality card.
- **New study:** two panels filling everything under the top bar. The top bar carries
  "Use the form instead" (secondary, to `?mode=form`, the step-by-step wizard) and
  "Create study" (primary, disabled until the brief has what a study requires).
- **Settings:** a 220px sub-nav beside the section. The top bar reads "Settings /
  {section}" with Sign out on the right.

### New study

`app/admin/projects/new`. The conversation is the page; the wizard it replaced is the same
address with `?mode=form`.

| Part | Spec |
|---|---|
| Conversation panel | `1fr`, right border, content capped at 720px, 32px 40px padding. The thread is the only scrolling region |
| Birdsong turn | 32px `ink` tile on `radius-chip` with four `accent-bright` bars, then the text at 15px / 1.55, 14px apart |
| Admin turn | Right-aligned, `bg-track`, 12px 16px padding, max 500px, `radius-card` with a 4px bottom-right corner |
| Quick replies | Under a Birdsong turn, only where the answer is a choice. 30px, `radius-chip`, 1px border, 12px/700 in `muted` |
| Replying | The tile and a five-bar `Waveform` with `live`, in place of the next turn |
| Input | `ChatInput`, capped at 640px, in a `shrink-0` row under the thread with a top border. It never moves |
| Brief panel | 440px (360px below `xl`), `bg-sidebar`, 28px padding, 16px between cards, scrolls on its own |
| Brief header | "Study brief" at 12px/700 uppercase in `muted-2`, "Editable anytime" at 12px opposite |
| Brief card | `bg`, 1px border, `radius-card`, 16px 18px padding, 12px/700 `muted-2` label. Unfilled: dashed border in `border-dashed` and "Waiting on your answer" in `muted-3` |
| Signals | A numbered list, each number a 22px `accent-weak` chip in mono 11px |
| Length | `FilterTabs` over the three presets, labelled by minutes |
| Thank you gift | A 38px dollar field, "No gift", then the brand chips once there is an amount |

Every card is click-to-edit in place. A field edited by hand belongs to the admin from
then on: later suggestions from the conversation never overwrite it.

The brief is kept in `sessionStorage` under the draft id in the address (`?draft=`), so a
refresh restores the conversation and the brief.

### Settings

`app/admin/settings/layout.tsx` draws the frame; each section is a route under it.
`/admin/settings` opens on Company profile, and `/admin/profile` redirects there.

| Part | Spec |
|---|---|
| Sub-nav | 220px, 1px right border, 24px 14px padding, 2px between items. Sticky under the top bar |
| Sub-nav item | 34px, `radius-chip`, 13px/600 in `muted`. Active: `bg-track`, `ink` at 700 |
| Sections | Company profile, Account, Notifications, Integrations, Team. One is listed only when it has content for the person looking |
| Content | 28px 32px padding. Every section but Company profile caps at 900px |
| Section title | 26px/800, -0.03em, with at most one 13px `muted-2` line under it |
| Setting row | A 260px left column (15px/800 title, one 13px `muted-2` line) and the control in a `Card`, rows separated by a hairline |
| Fields | 38px, `radius-control`, 1px border |

**Company profile** is a grid: content `1fr`, a 300px right column. The Edit with AI bar
is 46px on `radius-control` with the accent sparkle and an `ink` Apply button inside it.
Each group is a `Card` with the 44px `bg-sidebar` header and an accent Edit link that
opens the fields in place. The right column holds the Logo card: a 48px tile, Replace and
Remove. The top bar gains a Complete badge (`accent-weak`) and Fill with AI.

**Integrations** is one `Card` per vendor: a 40px tile, the name at 14px/700, a status
line with a 6px dot (`accent` connected, `muted-3` not), and Manage. The tile is a letter
on the vendor's brand colour until the official mark is in `public/logos`: `#FF7A59` for
HubSpot, `#4A154B` for Slack. **Those two are the only colours in admin that are not
tokens, and they appear nowhere else.** A logo is never drawn by hand.

A secret (the Slack webhook, the HubSpot token) is never sent to the browser or
rendered. A page shows whether one is set.

---

## Primitives

`components/admin/ui/`. No primitive fetches data, and each reads only tokens.
`tokens.ts` spells the Ledger II custom properties as class names, so no primitive
writes a colour, a radius or a shadow of its own.

| Component | Responsibility |
|---|---|
| `PageShell` | The container. Every admin page's outermost element |
| `PageHeader` | `eyebrow`, `title`, `badge`, `meta`, `subtitle`, `actions`. Strips a terminal period |
| `PageTopBar` | `crumbs: { label, href? }[]`, `actions`. Draws nothing in place: it portals into the shell's top bar. The primary action is last in `actions` and the only accent fill |
| `Button` | `variant` primary / secondary / dashed / ink / ghost, `size` default (34px) / sm (30px), `kbd` |
| `Card` | `padding` default / compact / flush, `interactive`, `header`, `headerAction` |
| `StatRow` | `{ label, value, emphasis?, note?, delta?, href? }[]`. One joined bar |
| `FilterTabs` | Segmented control with counts, for one choice over a list |
| `SectionTabs` | `tabs: { value, label, count?, href? }[]`, `value`, `onChange`, `label`, `trailing`. Text tabs on a hairline, 2px accent underline on the active one. A tab with `href` is a link; `trailing` is the right end of the row |
| `Badge` | `state`, one of the eleven in the table above. `variant` with children for anything that is not a status |
| `ScoreChip` | `score`, `variant` score / fit, `size` default (32 by 28) / sm (28 by 24) / hero (56px). An unscored row shows the empty glyph on no ground |
| `SearchInput` | 34px, icon left, optional mono `hint` right |
| `DataTable` | `columns`, `rows`, `rowKey`, `rowHref`, `rowClassName`, `density` stacked (60px) / default (54px), `layout` auto / fixed, `gridTemplate`, `stickyHeader`, `sort` and `onSort`, `empty`, `footer` |
| `StackedCell` | `primary`, `secondary`, `className`. The two-line cell: 15px/700 over 12px `muted-2`, both ellipsized |
| `EmptyState` | One sentence, one optional action, no chrome |
| `StatusDot` | The live dot |
| `FloatingBar`, `FloatingBarButton` | `label`, children. The ink pill of actions, pinned bottom centre of its positioned ancestor. Exactly one button is `primary`. The only pill in admin |
| `ChatInput` | `value`, `onChange`, `onSend`, `label`, `placeholder`, `disabled`. The 52px chat bar on `radius-card` with `shadow-input` and the accent send button. Enter sends, Shift+Enter makes a new line, and it grows to six lines |
| `Waveform` | `seed`, `bars` (24), `live`, `tone` light / ink / muted, `height`, `barWidth` (3), `align` center / end. Deterministic from the seed |
| `RelativeTime` | `date`, `align`, `prefix`. Every timestamp a person reads, in mono, exactly as `formatRelativeTime` returns it |
| `CollapsibleSection` | Set-once configuration on a detail page |
| `ScoreBadge` | The older name for a lead `ScoreChip`. Kept for its call sites |

**Props over variants-by-copy.** If two pages need two looks, that is a prop, not a
second component.

`Badge` also still accepts `variant` with free-text children, for a count or a marker
the state table does not cover. A status passes `state`.

`ScoreChip` bands by fill: 9 and up takes the accent with white text, 7 and 8 take
`accent-weak` with accent text, below 7 takes `bg-track` with `ink-3`. 7 is the
threshold in `lib/leads.ts`. `variant="fit"` is always neutral.

`DataTable` holds no state, so a server component can render it. Sorting lives in
`useTableSort`, a client hook beside it. `density="compact"` is accepted and renders as
`default`; Ledger II has two row heights.

`Column` is `{ key, header, cell, align?, width?, truncate?, title?, sortable?,
sortValue?, ariaSort?, rowLabel? }`. `width` is a named px step (`xxs` 40, `xs` 64, `sm`
96, `md` 128, `lg` 176) or a fraction below 1. A table drawn to a mockup passes
`gridTemplate` instead (`"minmax(0,1.4fr) minmax(0,1fr) 56px 56px 120px 80px"`): every
row is laid out on it with 16px between columns and 20px at the ends, and column `width`
is ignored. `footer` is one last row inside the frame, under a hairline ("Show all 14").

`Waveform` animates only with `live`. A study cover draws it static at 36 bars, 5px
wide, `align="end"`, in `light` for a live study and `muted` for a draft.

`RelativeTime` tightens the word gap: a space in a mono face is a full character cell,
which set "5d ago" with what read as two spaces.

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
- Buttons are verbs: "Push to HubSpot", "Copy call script", "Triage the 4".
- No subtitles under page titles. If a sentence explains a control, the control is wrong.

`EMPTY_VALUE` in `lib/format.ts` is the single empty-cell glyph. Import it; never type
the character. Comments are not copy.
