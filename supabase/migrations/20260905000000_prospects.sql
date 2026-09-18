-- Tokenized prospect entry for the respondent survey surface.
--
-- A prospect is a person we invited by name: an Apollo-sourced contact who
-- gets a unique link (/survey/[slug]/[token]) instead of the generic one.
-- The row exists before they ever click, which is what lets the landing page
-- greet them and prefill the intake the anonymous flow has to ask for.
--
-- The point of the token is that arriving is not the same as starting.
-- Email security scanners (Defender, Proofpoint, Mimecast) fetch every link
-- in a message before the recipient sees it, and /api/interview/start creates
-- a `responses` row — so a prefetched link is indistinguishable from a real
-- respondent and lands a phantom lead in the queue. started_at below is set
-- on the explicit click only, never on page load.
--
-- PII note: this table holds contact details for people who have not
-- responded and may never respond. It gets no anon policy at all — the token
-- lookup runs through the service-role client in server code, which is also
-- the only way a respondent-facing page can read a row it does not own.

create table public.prospects (
  id uuid primary key default gen_random_uuid(),

  -- The secret in the URL. Unique globally, not per-survey: the route scopes
  -- its lookup to the [slug] as well, but a token must never resolve to two
  -- different people even if that scoping is ever loosened.
  token text not null unique,

  survey_id uuid references public.surveys (id) on delete cascade,

  -- Derived from the parent survey by the trigger below, never asserted by
  -- the caller — the same rule set_response_user_id follows, and what makes
  -- the owner-only policies below safe.
  user_id uuid not null,

  first_name text,
  last_name text,
  email text not null,
  title text,
  company_name text,
  company_domain text,
  linkedin_url text,
  apollo_id text,

  -- Whatever the enrichment source returned (headcount, industry, revenue
  -- band, ...). Deliberately unshaped: it is display/scoring context, and
  -- pinning a schema to one vendor's field names would not survive the
  -- second vendor.
  firmographics jsonb not null default '{}',

  status text not null default 'pending',

  sent_at timestamptz,
  -- Set at the click, not at page load. See the header note.
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now()
);

-- One invite per person per study. Lowercased because the same human arrives
-- as both Jane@acme.com and jane@acme.com across enrichment runs, and two
-- invites to one person is the failure this prevents.
create unique index prospects_survey_email_idx
  on public.prospects (survey_id, lower(email));

create index prospects_survey_status_idx on public.prospects (survey_id, status);

create or replace function public.set_prospect_user_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select s.user_id into new.user_id
  from public.surveys s
  where s.id = new.survey_id;
  if new.user_id is null then
    raise exception 'prospects: survey % does not exist', new.survey_id;
  end if;
  return new;
end
$$;

drop trigger if exists set_prospect_user_id on public.prospects;
create trigger set_prospect_user_id
  before insert on public.prospects
  for each row
  execute function public.set_prospect_user_id();

-- Owner-only via user_id, per the brief for this table.
--
-- NOTE, deliberately different from its neighbours: every other table in
-- this schema moved to org-membership policies in 20260903000005_org_rls
-- (`org_id in (select public.user_org_ids())`). Prospects stay owner-scoped,
-- so a teammate who can see the org's responses cannot see the org's
-- un-contacted prospect list. If prospects should follow the lead queue into
-- team visibility, this is the one block to change — add org_id (with a
-- trigger matching set_response_org_id) and swap the four policies.
--
-- No anon policy of any kind, by design: the respondent-facing token lookup
-- is service-role only.
alter table public.prospects enable row level security;

create policy "owner reads prospects" on public.prospects
for select to authenticated
using (user_id = auth.uid());

create policy "owner inserts prospects" on public.prospects
for insert to authenticated
with check (user_id = auth.uid());

create policy "owner updates prospects" on public.prospects
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "owner deletes prospects" on public.prospects
for delete to authenticated
using (user_id = auth.uid());

-- ------------------------------------------------- responses: prospect_id
--
-- One direction only. A response points at the invite that produced it;
-- prospects carries no response_id back. The lifecycle columns above
-- (started_at / completed_at) are what the prospect side needs, and a
-- back-reference would be a second place for "did they answer?" to be
-- recorded — and therefore a second place for it to be wrong.
--
-- Nullable because most responses have no prospect: the generic link is
-- still the common path.
alter table public.responses
  add column if not exists prospect_id uuid references public.prospects (id) on delete set null;

create index if not exists responses_prospect_idx
  on public.responses (prospect_id)
  where prospect_id is not null;
