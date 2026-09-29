/**
 * The Ledger II tokens as class names.
 *
 * tailwind.config.ts only names the older aliases (bg-card, text-faint, …),
 * so a primitive reaching for a Ledger token has to write an arbitrary value
 * against the custom property. Those are spelled once, here, so no primitive
 * writes a colour, a radius or a shadow of its own. Every string is a
 * complete class name, which is what lets Tailwind's scanner find it.
 *
 * Values live in app/globals.css under `.admin-theme`.
 */

export const text = {
  ink: "text-[color:hsl(var(--ds-ink))]",
  ink2: "text-[color:hsl(var(--ds-ink-2))]",
  ink3: "text-[color:hsl(var(--ds-ink-3))]",
  muted: "text-[color:hsl(var(--ds-muted))]",
  muted2: "text-[color:hsl(var(--ds-muted-2))]",
  muted3: "text-[color:hsl(var(--ds-muted-3))]",
  accent: "text-[color:hsl(var(--ds-accent))]",
  onInk: "text-[color:hsl(var(--ds-on-ink))]",
  onInkMuted: "text-[color:hsl(var(--ds-on-ink-muted))]",
  statusNew: "text-[color:hsl(var(--ds-status-new-text))]",
  warn: "text-[color:hsl(var(--ds-warn-text))]",
} as const;

export const bg = {
  base: "bg-[color:hsl(var(--ds-bg))]",
  sidebar: "bg-[color:hsl(var(--ds-bg-sidebar))]",
  track: "bg-[color:hsl(var(--ds-bg-track))]",
  ink: "bg-[color:hsl(var(--ds-ink))]",
  accent: "bg-[color:hsl(var(--ds-accent))]",
  accentWeak: "bg-[color:hsl(var(--ds-accent-weak))]",
  accentSoft: "bg-[color:hsl(var(--ds-accent-soft))]",
  accentBright: "bg-[color:hsl(var(--ds-accent-bright))]",
  statusNew: "bg-[color:hsl(var(--ds-status-new-bg))]",
  warnBadge: "bg-[color:hsl(var(--ds-warn-bg-badge))]",
} as const;

/** Dot fills, for badges and live marks. */
export const dot = {
  accent: "bg-[color:hsl(var(--ds-accent))]",
  accentBright: "bg-[color:hsl(var(--ds-accent-bright))]",
  statusNew: "bg-[color:hsl(var(--ds-status-new))]",
  warn: "bg-[color:hsl(var(--ds-warn))]",
  danger: "bg-[color:hsl(var(--ds-danger))]",
  muted2: "bg-[color:hsl(var(--ds-muted-2))]",
  muted3: "bg-[color:hsl(var(--ds-muted-3))]",
  dashed: "bg-[color:hsl(var(--ds-border-dashed))]",
} as const;

export const border = {
  base: "border-[color:hsl(var(--ds-border))]",
  dashed: "border-[color:hsl(var(--ds-border-dashed))]",
  accent: "border-[color:hsl(var(--ds-accent))]",
} as const;

export const radius = {
  chip: "rounded-[var(--ds-radius-chip)]",
  control: "rounded-[var(--ds-radius-control)]",
  card: "rounded-[var(--ds-radius-card)]",
  hero: "rounded-[var(--ds-radius-hero)]",
  pill: "rounded-[var(--ds-radius-pill)]",
} as const;

// Arbitrary properties rather than shadow-[…]: a bare var() is ambiguous to
// Tailwind between a shadow and a shadow colour.
export const shadow = {
  input: "[box-shadow:var(--ds-shadow-input)]",
  activeNav: "[box-shadow:var(--ds-shadow-active-nav)]",
  float: "[box-shadow:var(--ds-shadow-float)]",
} as const;
