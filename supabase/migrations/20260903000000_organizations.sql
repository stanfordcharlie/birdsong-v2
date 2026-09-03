-- Organization + membership layer, part A of F: core tables.
--
-- Authorization moves from "auth.uid() = user_id" to "is the caller a member
-- of the row's organization". Every org-scoped table (surveys, responses,
-- profiles, survey_reports) gains an org_id in part C; user_id stays on all
-- of them and now means only "who created this record".
--
-- RLS is enabled here with no policies on purpose. Part F adds the read
-- policies once the helper functions (part B) exist. Writes to both tables
-- are service-role only for now: org creation happens in the signup path,
-- membership mutation is deliberately impossible from the client so a role
-- can never be escalated with the anon key in hand.

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('owner', 'admin', 'member');
  end if;
end
$$;

create table if not exists public.org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.org_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_user_id_idx on public.org_members (user_id);
create index if not exists org_members_org_id_idx on public.org_members (org_id);

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
