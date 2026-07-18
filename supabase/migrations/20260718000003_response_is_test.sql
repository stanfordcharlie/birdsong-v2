-- Test mode: lets a survey owner run their own interview end to end (via
-- /survey/[slug]?test=1) without polluting lead data, firing the admin
-- notification email, or skewing stats. Test rows are excluded from the
-- dashboard, leads queue, and per-survey counts by default.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses add column if not exists is_test boolean not null default false;
