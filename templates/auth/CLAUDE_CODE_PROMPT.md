# Claude Code Prompt

Paste this into Claude Code from the repo that serves `usebirdsong.com/admin`:

---

Redesign the admin auth pages — `/admin/signup` and `/admin/login` (currently plain white cards on a gray background).

A design handoff package is in `design_handoff_auth/` (unzip into the repo root or reference locally):
- `README.md` — the complete spec: layout, exact colors, typography, spacing, copy, animations, tokens. Source of truth.
- `Auth.dc.html` — a high-fidelity HTML prototype of both modes (the sign up ↔ log in switch works in-browser). It's a design reference in a prototype format, NOT production code — recreate it with this codebase's existing framework, components, and conventions.

Requirements:
1. Follow the README pixel-perfectly: eggshell `#faf8f1` page with soft radial washes, drifting blurred color blobs and note glyphs; top-left Birdsong logo lockup; centered 430px column; bobbing bird mascot above a Bricolage Grotesque headline; card on `#fffefa` with radius 22.
2. Headlines: sign up = "Start listening to your market"; log in = "Welcome back" — with the subcopy from the README.
3. Inputs per spec (eggshell fill, radius 11, green-tinted focus ring), password eye-toggle inside the field, "Forgot your password?" on the password label row (login only), full-width ink pill CTA with hover lift.
4. Sign up collects first name, last name, work email, password (min 8 chars helper), with the terms consent line under the CTA; the mode-switch link below the card navigates between the two routes.
5. Implement the staggered entrance reveal and ambient animations; honor `prefers-reduced-motion` by disabling all motion.
6. Load Bricolage Grotesque + Inter the way this codebase already loads fonts; reuse existing design tokens where they match.
7. Preserve all existing auth behavior: submission, validation, error and loading states, redirects. Restyle error messages to match the palette (no default red alert boxes).

Before writing code, read `README.md` fully and skim the prototype's inline styles for any value the README doesn't cover.
