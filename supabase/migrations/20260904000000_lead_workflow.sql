-- Lead queue workflow layer: status, assignment, disqualification reasons,
-- notes and an append-only activity trail.
--
-- Builds on the org layer (20260903000000..5). Nothing here touches the
-- policies that layer created, and responses_public_insert (the anon insert
-- the respondent flow depends on) is left exactly as it was.
--
-- The legal status transitions live in lib/leads/state.ts, not here: the
-- database stores whatever state the server actions decided on, and the
-- one function below (apply_lead_change) exists only so the row update and
-- its activity row commit together.

-- ------------------------------------------------------------------ enums

create type public.lead_status as enum (
  'new', 'assigned', 'contacted', 'meeting_booked',
  'qualified', 'disqualified', 'nurture'
);

-- Deliberately specific: this list becomes the spec for the pre-interview
-- screener later, so it has to separate "wrong company" from "right company,
-- wrong moment".
create type public.disqualify_reason as enum (
  'not_icp', 'no_budget', 'no_authority', 'no_pain',
  'competitor', 'bad_contact_info', 'unresponsive',
  'already_customer', 'other'
);

create type public.lead_activity_type as enum (
  'status_change', 'assigned', 'unassigned', 'note', 'crm_push'
);

-- --------------------------------------------------- responses: columns

alter table public.responses
  add column if not exists lead_status public.lead_status not null default 'new',
  add column if not exists assigned_to uuid references auth.users (id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists disqualify_reason public.disqualify_reason,
  add column if not exists disqualify_note text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists last_activity_at timestamptz;

create index if not exists responses_org_lead_status_idx
  on public.responses (org_id, lead_status);
create index if not exists responses_org_assigned_to_idx
  on public.responses (org_id, assigned_to);
create index if not exists responses_org_last_activity_idx
  on public.responses (org_id, last_activity_at desc);

-- Backfill. The trail starts now: no synthetic activity rows for history.
update public.responses
set lead_status = 'new',
    last_activity_at = created_at
where last_activity_at is null;

-- Every row has a last_activity_at after the backfill, and every new row
-- gets one at insert, so the column is structurally never null. (Nullable
-- was the brief; NOT NULL is what makes "all rows have it set" a fact rather
-- than a check that has to keep passing.)
alter table public.responses
  alter column last_activity_at set default now(),
  alter column last_activity_at set not null;

-- ------------------------------------------- responses: legacy `status`
--
-- responses.status (text: new / contacted / qualified / not_a_fit) predates
-- this layer and is still what the admin home's "Awaiting contact" count,
-- lib/leads.ts's worth-a-call rule and the study detail page read. Rather
-- than leave two status columns to drift, the old one becomes a projection
-- of the new one: nothing writes `status` directly any more (the PATCH
-- status route and StatusControl are removed in the same change), and this
-- trigger keeps it in step with every lead_status write, including the
-- backfill above and the default on insert.

create or replace function public.mirror_lead_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := case new.lead_status
    when 'new' then 'new'
    when 'assigned' then 'new'
    when 'contacted' then 'contacted'
    when 'meeting_booked' then 'contacted'
    when 'nurture' then 'contacted'
    when 'qualified' then 'qualified'
    when 'disqualified' then 'not_a_fit'
  end;
  return new;
end
$$;

drop trigger if exists mirror_lead_status on public.responses;
create trigger mirror_lead_status
  before insert or update of lead_status on public.responses
  for each row
  execute function public.mirror_lead_status();

-- ------------------------------------------------------- lead_activity

create table public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses (id) on delete cascade,
  -- Denormalized on purpose: RLS must not join back to responses to
  -- authorize a read. Set by the trigger below, never by application code.
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Null means Birdsong itself acted (the automatic CRM push on interview
  -- completion has no person behind it).
  actor_id uuid references auth.users (id) on delete set null,
  type public.lead_activity_type not null,
  from_status public.lead_status,
  to_status public.lead_status,
  body text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index lead_activity_response_created_idx
  on public.lead_activity (response_id, created_at desc);
create index lead_activity_org_created_idx
  on public.lead_activity (org_id, created_at desc);

-- org_id from the parent response, same pattern as set_response_org_id:
-- unconditional, so a caller can never file an activity under another org.
create or replace function public.set_lead_activity_org_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select r.org_id into new.org_id
  from public.responses r
  where r.id = new.response_id;
  if new.org_id is null then
    raise exception 'lead_activity: response % does not exist', new.response_id;
  end if;
  return new;
end
$$;

drop trigger if exists set_lead_activity_org_id on public.lead_activity;
create trigger set_lead_activity_org_id
  before insert on public.lead_activity
  for each row
  execute function public.set_lead_activity_org_id();

-- last_activity_at is derived from the trail rather than written alongside
-- it, so the two cannot disagree.
create or replace function public.touch_response_last_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.responses
  set last_activity_at = new.created_at
  where id = new.response_id
    and last_activity_at < new.created_at;
  return new;
end
$$;

drop trigger if exists touch_response_last_activity on public.lead_activity;
create trigger touch_response_last_activity
  after insert on public.lead_activity
  for each row
  execute function public.touch_response_last_activity();

-- Append-only: members read their org's trail; nothing else. Every write
-- comes from service-role server code, so a rep cannot forge or edit history.
alter table public.lead_activity enable row level security;

create policy "org members read lead_activity" on public.lead_activity
for select to authenticated
using (org_id in (select public.user_org_ids()));

-- ------------------------------------------------------ apply_lead_change
--
-- One mutation plus its activity row, in one transaction. The server actions
-- in lib/leads/actions.ts decide WHAT changes (they own the transition rules
-- and the permission checks) and call this for the write, so a row can never
-- change without a matching trail entry and a trail entry can never describe
-- a change that did not happen.
--
-- Service-role only: execute is revoked from every client-facing role, and
-- the function is SECURITY DEFINER so RLS on lead_activity (which has no
-- insert policy at all) does not apply inside it.

create or replace function public.apply_lead_change(
  p_response_id uuid,
  p_actor_id uuid,
  p_type public.lead_activity_type,
  p_to_status public.lead_status default null,
  p_set_assignee boolean default false,
  p_assigned_to uuid default null,
  p_disqualify_reason public.disqualify_reason default null,
  p_disqualify_note text default null,
  p_body text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.lead_status;
  v_activity_id uuid;
begin
  select lead_status into v_from
  from public.responses
  where id = p_response_id
  for update;
  if not found then
    raise exception 'apply_lead_change: response % does not exist', p_response_id;
  end if;

  update public.responses
  set
    lead_status = coalesce(p_to_status, lead_status),
    status_changed_at = case
      when p_to_status is not null and p_to_status <> v_from then now()
      else status_changed_at
    end,
    -- The reason belongs to the disqualification it explains: cleared on
    -- any move away from disqualified, untouched by non-status changes.
    disqualify_reason = case
      when p_to_status is null then disqualify_reason
      when p_to_status = 'disqualified' then p_disqualify_reason
      else null
    end,
    disqualify_note = case
      when p_to_status is null then disqualify_note
      when p_to_status = 'disqualified' then p_disqualify_note
      else null
    end,
    assigned_to = case when p_set_assignee then p_assigned_to else assigned_to end,
    assigned_at = case
      when not p_set_assignee then assigned_at
      when p_assigned_to is null then null
      else now()
    end
  where id = p_response_id;

  insert into public.lead_activity (response_id, actor_id, type, from_status, to_status, body, metadata)
  values (
    p_response_id,
    p_actor_id,
    p_type,
    case when p_to_status is not null then v_from end,
    p_to_status,
    p_body,
    p_metadata
  )
  returning id into v_activity_id;

  return v_activity_id;
end
$$;

revoke execute on function public.apply_lead_change(
  uuid, uuid, public.lead_activity_type, public.lead_status, boolean, uuid,
  public.disqualify_reason, text, text, jsonb
) from public, anon, authenticated;
