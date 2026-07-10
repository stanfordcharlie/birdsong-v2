-- Surveys need two distinct names: `title` is the internal name used in the
-- admin dashboard/emails, `external_title` is what respondents see on the
-- interview page itself. Not run yet — review, then apply with
-- `supabase db push` or the SQL editor.

alter table public.surveys add column if not exists external_title text;

-- Backfill existing surveys so respondent-facing pages (which now read
-- external_title instead of title) don't regress to a blank heading.
update public.surveys set external_title = title where external_title is null;
