# Birdsong design-sync notes

## Setup

Birdsong-v2 is a Next.js app, not a publishable component package — there's no
`dist/`, no `.d.ts` build, no Storybook. This sync uses the package shape's
synth-entry fallback (`cfg.entry` points at a deliberately nonexistent
`dist/index.js` so the converter's dist-resolution soft-fails and falls back
to scanning `cfg.srcDir` for exports). `cfg.pkg` (`birdsong-ui`) and
`cfg.globalName` (`Birdsong`) are nominal, invented for this sync, not a real
published package name.

`cfg.srcDir` is set to `components/ui` specifically (not the default
`components/`), because the repo's own `components/` directory holds the
whole app's business components (SurveyForm, AdminSidebar, NewSurveyWizard,
etc.) alongside the actual UI primitives in `components/ui/`. Leaving
`srcDir` unset would have pulled in the entire app as "the design system."

## CSS and fonts: a manual step every re-sync

The components use Tailwind utility classes (`rounded-control`, `bg-card`,
etc.) that don't exist in the raw `app/globals.css` source — only in
Tailwind's compiled output. `cfg.cssEntry` points at
`.design-sync/.cache/tailwind-build.css`, a file that must be **regenerated
by hand before each sync**:

1. Temporarily set `distDir: ".next-designsync"` in `next.config.mjs` (so an
   isolated production build doesn't collide with a running `next dev`
   server's `.next/`).
2. `npm run build`.
3. Copy the single file under `.next-designsync/static/css/*.css` to
   `.design-sync/.cache/tailwind-build.css`.
4. Delete `.next-designsync/` and revert `next.config.mjs`.

The app's font (Inter, via `next/font/google`) is similarly not a normal
`@font-face` — Next generates it with an absolute `/_next/static/media/...`
url() that can't resolve on disk, so the build's own `@font-face` rules for
it are always dropped as dangling. The actual fix already lives in
`.design-sync/fonts/inter.css` + `.design-sync/fonts/inter/*.woff2`
(committed, real font files extracted from a build), wired via
`cfg.extraFonts`. This renames Next's internal hashed family name to plain
"Inter" and sets `--font-inter` on `:root` (not the page-scoped class Next
normally generates), so it resolves in any preview card. **This shouldn't
need to change** unless the font itself changes (a different `next/font`
family/weight) — if so, redo the same extraction from a fresh isolated build
and regenerate `inter.css`.

## Re-sync risks

- **`tailwind-build.css` will silently drift** from the app's real styles if
  someone edits `app/globals.css`, `tailwind.config.ts`, or any component's
  className usage and this cache file isn't regenerated first (step above).
  There's no automated check for this — a re-sync will happily upload a
  stale stylesheet if the manual rebuild step is skipped.
- **Component grouping is all `general`** — none of the 17 exports matched a
  more specific group (no docs/JSDoc `@category` present), so `cfg.docsDir`
  or per-component JSDoc would improve grouping on a future pass.
- **All 17 previews are fully authored** (`.design-sync/previews/*.tsx`),
  not floor cards — there's no "author incrementally later" backlog for this
  sync, but any *new* component added to `components/ui/` will start as a
  floor card until a preview is written for it.
- `docsDir`/JSDoc: none of the 17 components have a matched doc file
  (`[DOCS_UNMAPPED]` fired for all 17 at build time) — every `.prompt.md` is
  synthesized from the `.d.ts` + preview, not a real usage doc. Fine for now
  given the small component count, but worth revisiting if this design
  system grows.
