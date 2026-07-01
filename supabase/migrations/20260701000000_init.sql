-- Birdsong initial schema: surveys + responses.
-- Not run yet — review, then apply with `supabase db push` or the SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.surveys (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  topic             text,
  sponsor           text,
  question_guide    text,
  tone              text,
  num_questions     integer,
  gift_card_amount  numeric,
  custom_fields     jsonb not null default '[]'::jsonb,
  user_id           uuid not null references auth.users (id) on delete cascade,
  created_at        timestamptz not null default now()
);

create index if not exists surveys_user_id_idx on public.surveys (user_id);

create table if not exists public.responses (
  id                    uuid primary key default gen_random_uuid(),
  survey_id             uuid not null references public.surveys (id) on delete cascade,
  respondent_name       text,
  respondent_email      text,
  respondent_phone      text,
  messages              jsonb not null default '[]'::jsonb,
  pain_points           jsonb not null default '[]'::jsonb,
  lead_score            integer,
  completed             boolean not null default false,
  custom_field_values   jsonb not null default '{}'::jsonb,
  -- Denormalized from surveys.user_id at insert time so RLS can scope reads
  -- to the survey owner without a join. Populated by the trigger below.
  user_id               uuid not null references auth.users (id) on delete cascade,
  created_at            timestamptz not null default now()
);

create index if not exists responses_survey_id_idx on public.responses (survey_id);
create index if not exists responses_user_id_idx on public.responses (user_id);

-- Auto-fill responses.user_id from the parent survey so callers (including
-- the public, unauthenticated survey-start route) never have to know or
-- trust a user_id value themselves.
create or replace function public.set_response_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select user_id into new.user_id
  from public.surveys
  where id = new.survey_id;

  return new;
end;
$$;

drop trigger if exists set_response_user_id on public.responses;
create trigger set_response_user_id
  before insert on public.responses
  for each row
  execute function public.set_response_user_id();

alter table public.surveys enable row level security;
alter table public.responses enable row level security;

-- Survey owners can fully manage their own surveys.
create policy "surveys_owner_all"
  on public.surveys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The public survey-start flow needs to look up a survey by slug before the
-- respondent is ever authenticated, so survey rows are readable by anyone.
create policy "surveys_public_read"
  on public.surveys
  for select
  using (true);

-- Response owners (the survey creator) can fully manage the responses to
-- their own surveys, e.g. the admin dashboard and lead-scoring views.
create policy "responses_owner_all"
  on public.responses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Unauthenticated respondents can create a response row when they start an
-- interview. user_id is populated server-side by the trigger above, not by
-- the client, so this can't be used to write into someone else's data.
-- Subsequent updates (appending interview messages, scoring) are performed
-- by the API routes using the service-role key, which bypasses RLS, so no
-- public UPDATE policy is needed here.
create policy "responses_public_insert"
  on public.responses
  for insert
  with check (
    exists (
      select 1 from public.surveys where id = survey_id
    )
  );
