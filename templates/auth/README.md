# Birdsong Auth — Sign up / Log in redesign

Design handoff spec for the admin auth pages at `usebirdsong.com/admin/signup` and `/admin/login`. Source prototype: `Auth.dc.html` (open in a browser; sign up ↔ log in switch is live).

## Design tokens
- Background `--bg: #faf8f1` (eggshell; alt cream tone `#f3ecdf`)
- Surface (card) `--surface: #fffefa`, border `--border: #e9e3d3`
- Ink `#241f18`, muted `#6f6757`, faint `#a89d88`
- Green `#3a6046` / green-bg `#e4ecdd`; blue `#54749e` / blue-bg `#e4ebf4`
- Fonts: display = Bricolage Grotesque (700), UI = Inter. Google Fonts.

## Page layout (both modes)
- Full-viewport eggshell page, `overflow:hidden`, flex column.
- Ambient layer (absolute, pointer-events none): two radial washes (green at 24%/-8%, blue at 76%/-10%, ~9% opacity), two blurred drifting color blobs (300px, blur 70px, `drift` 14–17s), four floating note glyphs (♪ ♫, 14–19px, opacity .35–.45, `drift` 9–13s).
- Header: top-left logo lockup — bird mark (ink, 22×20, `bob` 6s) + "Birdsong" wordmark (Bricolage 700, 20px). Links to landing page.
- Main: centered column, max-width 430px, starts high (align-items flex-start, ~28px top padding below header).
- Footer: centered, faint 13px — "© 2026 Birdsong · Terms · Privacy · Help".

## Above the card
- Bobbing bird mascot (40×37, ink) with two looping music notes rising off it (7s loop, staggered).
- H1, Bricolage 700, 36px, centered, letter-spacing -.02em:
  - Sign up: "Start listening to your market"
  - Log in: "Welcome back"
- Subcopy, Inter 15px muted, centered:
  - Sign up: "Create your account and launch your first interview in minutes."
  - Log in: "Log in to your Birdsong account."

## Card
- Surface bg, 1px border, radius 22px, padding 32px 34px 30px, shadow `0 4px 14px rgba(38,32,25,.06)`.
- Fields stacked with 16px gap. Labels above inputs: 13px, weight 600, muted.
- Inputs: bg = page eggshell (`--bg`), 1px `--border`, radius 11px, padding 12px 14px, 15px Inter, placeholder faint. Focus: border faint + `box-shadow 0 0 0 3px rgba(58,96,70,.1)`, no outline.
- Sign up fields: First name / Last name (2-col grid, 12px gap), Work email, Password (helper below: "At least 8 characters.", 12.5px faint).
- Log in fields: Work email, Password. "Forgot your password?" sits right-aligned on the password label row (13px muted, underlined).
- Password field has an eye toggle button inside the input (right: 6px, faint → muted on hover); toggles input type and swaps to slashed-eye icon.
- CTA: full-width ink pill (radius 999px, padding 15px 24px, 16px/600, bg-color text). Hover: translateY(-2px) + `0 14px 30px rgba(38,32,25,.18)`. Label: "Create account" / "Log in".
- Sign up only, under CTA inside card: "By creating an account, you agree to our Terms and Privacy Policy." — 12.5px faint, centered, links muted + underlined.

## Below the card
- Mode switch line, 14.5px muted: "Already have an account? **Log in**" / "New to Birdsong? **Create an account**" — link 600, underlined, navigates between /admin/signup and /admin/login.

## Motion
- Staggered entrance: elements fade + rise 16px (0.8s, cubic-bezier(.2,.7,.2,1)), delays 0 → .3s top to bottom (header, mascot, h1, subcopy, card, switch line, footer).
- Ambient: `bob` (bird), `drift` (blobs/notes), note loops.
- `prefers-reduced-motion: reduce` disables all animation and shows everything settled.

## Behavior to preserve
- Form submission, validation, and error states use existing auth logic. Style inline field errors with ink text on a subtle warm tone consistent with these tokens (no red-alert boxes that clash with the palette).
- Links: Terms/Privacy point at existing pages; logo → marketing landing.
