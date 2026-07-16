-- Backs the redesigned surveys list page's Status column and "Live" filter
-- chip. No draft/live concept existed before this — every survey defaults
-- to 'live' on creation (matching current behavior, where nothing gates a
-- survey from being reachable the moment it's made), and the survey detail
-- page gets a toggle to flip a survey to 'draft' and back.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.surveys add column if not exists status text not null default 'live';

alter table public.surveys drop constraint if exists surveys_status_check;
alter table public.surveys add constraint surveys_status_check
  check (status in ('draft', 'live'));
