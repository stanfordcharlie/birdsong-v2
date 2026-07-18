# Birdsong

See [DESIGN.md](./DESIGN.md) for the platform's design system (colors, typography,
spacing/radius, component patterns) before making any UI changes. It documents what's
actually implemented, not a spec to guess from. Covers admin + the respondent survey
interview (`app/survey/[slug]`); marketing pages (`app/landing-page*`) are out of
scope and use their own fonts.

When using `createAdminClient()` (service role, bypasses RLS) to read data on behalf
of an unauthenticated or differently-scoped caller, always select the exact columns
needed — never `select("*")`. See the comment in `lib/supabase/admin.ts`.
