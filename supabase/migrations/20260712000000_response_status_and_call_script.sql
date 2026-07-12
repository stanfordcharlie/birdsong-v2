-- The response detail page needs a pipeline status and an auto-generated
-- call script for reps, neither of which existed before.
--
-- summary is its own column rather than folded into call_script: the
-- detail page needs a persisted one-line AI summary, and call_script's
-- shape is specifically { opener, talking_points }, a scalar summary
-- string doesn't belong inside that structured object.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses add column if not exists status text not null default 'new';
alter table public.responses add column if not exists call_script jsonb;
alter table public.responses add column if not exists summary text;

alter table public.responses drop constraint if exists responses_status_check;
alter table public.responses add constraint responses_status_check
  check (status in ('new', 'contacted', 'qualified', 'not_a_fit'));
