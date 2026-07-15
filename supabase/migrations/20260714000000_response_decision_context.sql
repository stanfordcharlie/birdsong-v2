-- Adds a spot for whatever qualification-adjacent context the interview
-- picks up naturally (who's involved, what's driving the timing, what
-- they care about), extracted alongside the existing pain points and
-- call script. Plain text, not structured, since it's whatever surfaced
-- and often nothing at all.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses add column if not exists decision_context text;
