-- Archive-first survey deletion. Archiving is reversible (sets/clears this
-- timestamp); permanent delete is a separate, irreversible hard-delete of
-- the row, only offered in the UI when a survey has zero responses.
--
-- NULL = active (default, unchanged behavior). Non-null = archived: hidden
-- from the default admin surveys list, excluded from admin stats, and the
-- public /survey/[slug] page shows a closed-study state instead of the
-- interview. Existing responses are untouched either way — this column
-- only gates visibility/acceptance of new ones, never read/write access to
-- responses already collected.
alter table public.surveys add column if not exists archived_at timestamptz;

comment on column public.surveys.archived_at is 'When set, survey is archived: hidden from default admin list/stats, public page shows a closed state. NULL = active. Existing responses remain fully accessible regardless.';
