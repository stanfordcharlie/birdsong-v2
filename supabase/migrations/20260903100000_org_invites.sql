-- Team invites, on top of the organization layer (20260903000000..5).
--
-- An invite is a row holding a random token; the email in it is the ONLY
-- account that may redeem it (checked case-insensitively at accept time).
-- Every mutation (create, resend, revoke, accept) runs server-side through
-- the service role. Members can read their org's invites so the Team page
-- can list them, and nothing else: with no insert/update/delete policy the
-- anon and authenticated roles cannot forge, extend or accept one.

create table if not exists public.org_invites (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  email        text not null,
  role         public.org_role not null default 'member',
  token        text not null unique,
  invited_by   uuid references auth.users (id),
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists org_invites_org_id_idx on public.org_invites (org_id);
create index if not exists org_invites_email_idx on public.org_invites (lower(email));

-- One open invite per address per org. Accepted rows fall out of the index,
-- so an address that was invited, joined, left and is invited again is fine.
create unique index if not exists org_invites_pending_email_key
  on public.org_invites (org_id, lower(email))
  where accepted_at is null;

alter table public.org_invites enable row level security;

drop policy if exists "org members read org_invites" on public.org_invites;
create policy "org members read org_invites" on public.org_invites
for select to authenticated
using (org_id in (select public.user_org_ids()));

-- ---------------------------------------------------------------------------
-- Invariant: an organization has exactly one owner.
--
-- The application enforces the "exactly" half (an owner is never removed and
-- never demoted except by transfer); this index makes "at most one" a fact
-- the database refuses to violate, whatever code path gets there.
create unique index if not exists org_members_one_owner_key
  on public.org_members (org_id)
  where role = 'owner';

-- Ownership transfer as one transaction: demote the current owner to admin,
-- then promote the new owner. Two separate updates from the application
-- could leave an org with no owner between them, or fail the unique index
-- above if run in the other order. Service-role only, like every other
-- membership mutation.
create or replace function public.transfer_org_ownership(
  target_org uuid,
  new_owner uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
begin
  select user_id into current_owner
  from public.org_members
  where org_id = target_org and role = 'owner'
  for update;

  if current_owner is null then
    raise exception 'organization % has no owner', target_org;
  end if;
  if current_owner = new_owner then
    return;
  end if;
  if not exists (
    select 1 from public.org_members where org_id = target_org and user_id = new_owner
  ) then
    raise exception 'user % is not a member of organization %', new_owner, target_org;
  end if;

  update public.org_members set role = 'admin'
    where org_id = target_org and user_id = current_owner;
  update public.org_members set role = 'owner'
    where org_id = target_org and user_id = new_owner;
end
$$;

revoke execute on function public.transfer_org_ownership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_org_ownership(uuid, uuid) to service_role;
