-- Thought-leadership report drafts generated from a survey's completed
-- interviews. Regeneration inserts a new row (history preserved); the UI
-- shows the latest. content is the structured report JSON; respondent_count
-- is how many completed interviews fed it.

create table if not exists public.survey_reports (
  id                uuid primary key default gen_random_uuid(),
  survey_id         uuid not null references public.surveys (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  content           jsonb not null,
  respondent_count  integer not null,
  created_at        timestamptz not null default now()
);

create index if not exists survey_reports_survey_id_idx
  on public.survey_reports (survey_id, created_at desc);

alter table public.survey_reports enable row level security;

-- Owner-only read/write, matching surveys_owner_all / responses_owner_all.
create policy "survey_reports_owner_all"
  on public.survey_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
