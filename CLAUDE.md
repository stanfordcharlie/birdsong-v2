# Birdsong

See [DESIGN.md](./DESIGN.md) before making any UI change, and check
`/admin/styleguide`, which renders the whole system live. `app/globals.css` is the
single source of truth; DESIGN.md is a human-readable mirror of it.

DESIGN.md covers the **admin** surface (`app/admin/**`, `components/admin/**`,
`AdminSidebar`). The respondent survey (`app/survey/[slug]`, `--sv-*`), the marketing
pages (`--lp-*`) and the auth screens are separate designed surfaces with their own
tokens; admin must not reach across into them. Admin components import from
`components/admin/ui`; respondent and marketing import from `components/ui`. The two
sets are intentionally forked and neither side edits the other's copy.

When using `createAdminClient()` (service role, bypasses RLS) to read data on behalf
of an unauthenticated or differently-scoped caller, always select the exact columns
needed — never `select("*")`. See the comment in `lib/supabase/admin.ts`.
