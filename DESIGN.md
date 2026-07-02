# Birdsong Design System

Status: **documented and tooled, not yet applied to any page.** This is the reference
for every future UI prompt. Existing pages keep their current plain-Tailwind styling
until they're deliberately migrated — see [Rollout status](#rollout-status) at the
bottom for exactly what that migration involves.

Reference points: Linear, Granola, Attio — quiet, confident, high-density B2B SaaS.
Neutral surfaces, a single decisive accent color, minimal chrome, no gradients or
decorative shadows.

## Color palette

| Token | Hex | HSL | Usage |
|---|---|---|---|
| Page background | `#f8f8f7` | `60 7% 97%` | App shell background, behind cards |
| Card background | `#ffffff` | `0 0% 100%` | Cards, popovers, modals, inputs |
| Primary text | `#111111` | `0 0% 7%` | Headings, body copy, primary labels |
| Secondary text | `#6b7280` | `220 9% 46%` | Meta text, captions, muted labels, placeholders |
| Border | `#e5e7eb` | `220 13% 91%` | Card borders, dividers, input borders |
| Sidebar background | `#111111` | `0 0% 7%` | App sidebar / dark chrome |
| Sidebar text | `#9ca3af` | `218 11% 65%` | Sidebar inactive labels |
| Sidebar active text | `#ffffff` | `0 0% 100%` | Sidebar active/selected item |

### Accent — proposed: Indigo `#4f46e5`

| Token | Hex | HSL |
|---|---|---|
| Accent / Primary | `#4f46e5` | `243 75% 59%` |
| Accent hover | `#4338ca` | `244 68% 52%` |
| Accent foreground | `#ffffff` | `0 0% 100%` |

**Why indigo:** the base palette (near-black text, warm-neutral background, true-black
sidebar) is desaturated by design, so the accent is the only place the product gets to
say anything. Indigo reads as confident and technical without tipping into "generic
corporate blue" (Attio) or feeling too playful — it's close to Linear's signature
accent family, which is exactly the register this product wants (AI-moderated,
research-grade, not a marketing toy). It also has excellent contrast against both the
white card surface and the dark sidebar, so it works as a single accent across both
contexts instead of needing a separate "dark mode" accent.

Alternatives considered and rejected: blue (`#2563eb`, reads as generic SaaS/Attio-clone),
teal/green (feels more consumer/wellness than B2B research), black-on-black
monochrome-only (Linear can pull this off because of extreme typographic polish; too
risky for a younger product).

### Semantic colors

| Token | Hex | HSL | Usage |
|---|---|---|---|
| Success | `#16a34a` | `142 76% 36%` | "Done" status, positive confirmations |
| Warning | `#f59e0b` | `38 92% 50%` | "In progress" status, caution states |
| Destructive | `#dc2626` | `0 72% 51%` | Delete/destroy actions, error text |

Status badges (done / in progress / planned, as used on the roadmap) map to
success / warning / neutral respectively — see [Badges](#badges).

## Typography

**Typeface: [Inter](https://fonts.google.com/specimen/Inter)**, variable weight, loaded
via `next/font/google`. Already configured at `lib/fonts.ts`, not yet wired into
`app/layout.tsx` (see [Rollout status](#rollout-status)).

| Style | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| H1 | 30px / `text-3xl` | 600 (semibold) | 1.2 | Page titles |
| H2 | 24px / `text-2xl` | 600 (semibold) | 1.25 | Section headings |
| H3 | 18px / `text-lg` | 600 (semibold) | 1.3 | Card titles, subsection headings |
| H4 | 16px / `text-base` | 600 (semibold) | 1.4 | Small headings, list group labels |
| Body | 14px / `text-sm` | 400 (regular) | 1.5 | Default body copy, form labels |
| Body emphasis | 14px / `text-sm` | 500 (medium) | 1.5 | Emphasized inline text, active nav items |
| Small / meta | 12px / `text-xs` | 400 (regular) | 1.4 | Timestamps, helper text, table meta |
| Small emphasis | 12px / `text-xs` | 500 (medium), uppercase, tracked | 1.4 | Table headers, section eyebrows, badges |

Default body text color is `--foreground` (primary text); meta/secondary text uses
`text-muted-foreground`.

## Spacing & radius

**Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32px (`gap-1`, `gap-2`, `gap-3`, `gap-4`,
`gap-6`, `gap-8` in Tailwind's default scale — no custom spacing tokens needed, the
default scale already lines up).

- `4px` — tight inline spacing (icon-to-label gaps)
- `8px` — related-element spacing (label to input, button icon to text)
- `12px` — internal card/component padding on compact elements
- `16px` — default component padding, gaps between form fields
- `24px` — spacing between distinct sections within a page
- `32px` — spacing between major page regions

**Radius:**
- Cards, modals, popovers: `12px` (`rounded-card`)
- Buttons, inputs, selects: `8px` (`rounded-control`)
- Badges/pills: fully rounded (`rounded-full`)

Both radius values are CSS variables (`--ds-radius-card`, `--ds-radius-control`) so
they can be tuned globally in one place.

**Elevation:** flat by default. Cards use a 1px border (`border-border`), not a shadow.
Reserve shadows for genuinely floating elements (dropdowns, modals, popovers) and keep
them subtle — `shadow-sm`/`shadow-md` from Tailwind's defaults, never anything heavier.

## Component patterns

All components live in `components/ui/` (shadcn convention) and are built on Radix UI
primitives + `class-variance-authority` for variants, Tailwind v3 compatible (see
[Tooling](#tooling) for why this matters).

### Buttons

Component: `components/ui/button.tsx`. Variants:

- **`primary`** (default) — solid accent fill (`bg-primary`), white text. The one
  emphasized action per view (submit, create, save).
- **`secondary`** — white/card background, border, dark text. Default choice for
  non-primary actions sitting next to a primary button.
- **`destructive`** — soft red fill (`bg-destructive/10`, red text) rather than a solid
  red button — solid red is reserved for the confirming action inside a delete
  confirmation, not the trigger.
- **`ghost`** — no background/border until hover. Toolbar icon buttons, low-emphasis
  inline actions.
- **`link`** — text-only, accent-colored, underline on hover.

Sizes: `sm` (32px), `default` (36px), `lg` (40px), `icon` (36×36px square).

### Cards

Component: `components/ui/card.tsx` (`Card`, `CardHeader`, `CardTitle`,
`CardDescription`, `CardContent`, `CardFooter`). White background, `12px` radius, 1px
border, no shadow at rest. This is the default container for grouped content —
survey detail sections, roadmap items, form panels.

### Form inputs

Component: `components/ui/input.tsx`. `8px` radius, 1px border (`border-input`), white
background, `36px` height to match button height for aligned rows. Focus state is a
2px accent ring (`ring-ring`), not a border-color change alone — meets the same
"decisive accent, minimal chrome" principle as buttons. Placeholder text uses
`text-muted-foreground`.

### Badges / status indicators

Component: `components/ui/badge.tsx`. Small pill (`rounded-full`), tinted background
at 10% opacity + full-strength text color — never a solid fill, which reads as too
loud for a status chip repeated many times in a list (e.g. the roadmap board).

Recommended mapping for the roadmap's done/in-progress/planned states:

| Status | Variant | Look |
|---|---|---|
| Done | `success` | Green tint, green text |
| In Progress | `warning` | Amber tint, dark text |
| Planned | `default` | Neutral gray tint |

### Tables

Component: `components/ui/table.tsx`. Header row: uppercase, `12px`, medium weight,
`text-muted-foreground`, bottom border only (no header background fill). Body rows:
bottom border between rows, no vertical borders, subtle background on hover
(`hover:bg-secondary`). This matches the existing `ResponsesTable` layout already in
the app — the goal for that component's eventual migration is visual polish, not a
structural rewrite.

## Tooling

- **Library:** [shadcn/ui](https://ui.shadcn.com), Radix UI primitives, Tailwind v3
  (matching this project's existing Tailwind version — **not** v4).
- **Config:** `components.json` (style: `new-york`, base color: `neutral`, CSS
  variables enabled).
- **Adding new components:** `npx shadcn@latest add <component>` will offer to
  generate Tailwind v4-style output by default since the CLI's newer versions assume
  v4 (Base UI primitives, `@theme`/OKLCH tokens, `tw-animate-css`). **Do not accept
  that output as-is on this project** — either hand-adapt it to the v3 pattern used in
  `components/ui/button.tsx` (Radix `Slot` + CVA + `hsl(var(--x) / <alpha-value>)`
  tokens), or ask for help translating it. This bit us once already setting this up.
- **Utility:** `lib/utils.ts` exports `cn()` (clsx + tailwind-merge), the standard
  shadcn className helper.
- **Icons:** `lucide-react`.
- **Animation:** `tailwindcss-animate` plugin (the v3-compatible equivalent of the
  newer `tw-animate-css`).

### CSS variable naming

Every design-system CSS variable is prefixed `--ds-*` (e.g. `--ds-primary`,
`--ds-border`) rather than the shadcn-conventional unprefixed names (`--primary`,
`--border`). This is deliberate: `--background` and `--foreground` are **already**
live, unprefixed CSS variables that the `<body>` tag depends on directly (several
pages rely on the plain body background/text showing through unclassed full-height
wrappers). Prefixing every new token sidesteps that collision entirely, at the cost of
one indirection: `tailwind.config.ts` maps the clean, standard Tailwind class names
(`bg-primary`, `border-border`, `bg-card`, etc.) to the prefixed CSS variables, so
component code and usage never needs to know about the `--ds-` prefix — it's purely an
implementation detail in `globals.css` and `tailwind.config.ts`.

## Rollout status

Nothing in `app/` currently uses any of these tokens or components. This phase was
scoped to tooling only. To actually apply the system to a page:

1. Swap literal Tailwind utility classes (`bg-black`, `text-neutral-900`, `border`,
   etc.) for the semantic tokens (`bg-primary`, `text-foreground`, `border-border`).
2. Swap raw `<button>`/`<input>` elements for `components/ui/button.tsx` /
   `components/ui/input.tsx`.
3. Once **every** page has migrated off the legacy `--background`/`--foreground`
   values, retire them and rename `--ds-page-background`/`--ds-foreground` to the
   unprefixed `--background`/`--foreground` shadcn convention, and simplify
   `tailwind.config.ts` accordingly.
4. To activate Inter: import `inter` from `lib/fonts.ts` into `app/layout.tsx` and add
   `inter.variable` to the root `<html>` or `<body>` className, alongside
   `font-sans` (already configured in `tailwind.config.ts` to resolve to
   `var(--font-inter)`).

None of this has been done yet — by design, per this task's scope.
