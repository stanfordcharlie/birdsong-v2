-- Tracks AI-assisted enrichment on company profiles. Not run yet — review,
-- then apply with `supabase db push` or the SQL editor.

alter table public.profiles
  add column if not exists enrichment_sources jsonb not null default '[]'::jsonb,
  add column if not exists last_enriched_at timestamptz;
