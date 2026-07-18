-- The lead score now measures fit-and-friction against the sponsor's
-- specific product rather than generic friction. fit_reason carries the
-- one-sentence explanation of that fit judgment for the rep.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses add column if not exists fit_reason text;
