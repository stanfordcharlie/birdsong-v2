-- Replaces the free-text decision_context column with a structured
-- signals object (economic buyer, decision criteria, decision process,
-- metrics, champion). Each field is populated only when the interview
-- actually surfaced it, so most responses will have a signals object
-- with some or all fields null.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses drop column if exists decision_context;
alter table public.responses add column if not exists signals jsonb;
