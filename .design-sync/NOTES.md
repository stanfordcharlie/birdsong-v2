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
3. Run `node .design-sync/fix-css-cache.mjs .next-designsync/static/css/*.css .design-sync/.cache/tailwind-build.css`
   — **do not just copy the file.** See below for why.
4. Delete `.next-designsync/` and revert `next.config.mjs`.

### Why step 3 isn't a plain copy

The raw build CSS carries Next's own font machinery for *every* `next/font`
family the app uses (currently Inter and Source Serif 4, see `lib/fonts.ts`)
— `@font-face` rules with an absolute `/_next/static/media/...` url() that
only a live Next server resolves, plus a matching `--font-inter` /
`--font-source-serif` custom property scoped to a Next-generated
`.__variable_*` class rather than `:root`. Both are permanently dangling in
a static cache file with no server behind it.

For Inter this is already solved on the *other* side: `cfg.extraFonts`
points at `.design-sync/fonts/inter.css` + `.design-sync/fonts/inter/*.woff2`
(committed, real font files extracted from a build), which renames Next's
internal hashed family name to plain "Inter" and sets `--font-inter` on
`:root` directly. **This shouldn't need to change** unless Inter itself
changes (a different `next/font` family/weight) — if so, redo the same
extraction from a fresh isolated build and regenerate `inter.css`. Source
Serif 4 has no such replacement and doesn't need one: it's only used by an
app-level page (`CompanyProfileSetupFlow.tsx`), not by anything under
`components/ui` (this bundle's `srcDir`), so the design-sync bundle never
needs it to resolve at all.

Given that, `fix-css-cache.mjs` strips both fonts' dangling `@font-face`
rules and non-root `--font-*` declarations from the raw build CSS entirely
— Inter's correct copy already exists via `extraFonts`, and Source Serif's
doesn't need one. It leaves each font's `local()`-sourced fallback
`@font-face` alone (e.g. `src: local("Arial")`) since those aren't broken,
just currently unreferenced.

The same script also annotates every remaining non-root `--tw-*` custom
property (Tailwind's own utility-composition internals — transform, filter,
ring, shadow, backdrop, etc.) with a trailing `/* @kind color|spacing|shadow|other */`
comment, so an external audit doesn't flag them as unclassified. These are
intentionally scoped per-utility-class rather than `:root` — that's how
Tailwind's compositional model works (e.g. `--tw-translate-x` has to differ
per element), so they're annotated in place, not relocated. If a *new* real
design token (something referenced in `tailwind.config.ts`'s theme, like
`--font-inter` was) ever ends up emitted outside `:root` the same way, add
it to the strip list in `fix-css-cache.mjs` alongside `--font-inter` /
`--font-source-serif` rather than hand-patching the generated file.

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
