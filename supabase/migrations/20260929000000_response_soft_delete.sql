-- Soft delete for responses: an admin removes a test run or a junk interview
-- from every surface without the row leaving the database.
--
-- Why a timestamp and not a delete. A mistaken delete is recoverable (clear
-- the column), and a response already pushed to HubSpot keeps the
-- hubspot_contact_id / hubspot_deal_id that deal points back at. Nothing in
-- HubSpot is touched either way; the UI says so before it deletes.
--
-- NULL = visible, the default and the existing behaviour for every row.
-- Non-null = deleted: excluded from the study's stats and Responses tab, the
-- Leads queue and its sidebar count, Home, search, the Live roster, report
-- generation and the manual HubSpot push. The respondent-facing interview
-- routes are deliberately NOT filtered: a respondent mid-interview whose
-- response is deleted keeps their session, and their answers keep landing on
-- a row the admin surfaces already ignore.
--
-- Not a provenance flag. A later synthetic-vs-real column answers "where did
-- this row come from"; this one answers "did an admin remove it". Nothing
-- here forecloses that.

alter table public.responses add column if not exists deleted_at timestamptz;

comment on column public.responses.deleted_at is 'When set, an admin removed this response: excluded from every admin read (stats, Responses tab, Leads, Home, search, reports, HubSpot push). NULL = visible. The row, its transcript and its HubSpot ids are kept, so clearing this column restores it.';

-- The shape of every read this gates: rows of one study, visible ones only.
-- Partial would be smaller, but the Responses tab and the study stats both
-- ask for (survey_id, deleted_at is null), and a partial index on
-- "deleted_at is null" cannot serve a query that also wants the deleted ones
-- back later for a restore.
create index if not exists responses_survey_deleted_idx
  on public.responses (survey_id, deleted_at);

-- --------------------------------------------------------------------- RLS
--
-- Scoping is already correct and is left alone. "org members read responses"
-- and "org members update responses" (20260903000005_org_rls.sql) confine
-- every read and write to the caller's own organization, which is what
-- ownership means in this schema: responses.user_id is a denormalized copy
-- of the parent survey's owner, not a per-row owner anyone is scoped to.
-- A soft delete is an UPDATE of deleted_at, so that policy already permits
-- it for one's own rows and refuses it for everyone else's.
--
-- What the policy cannot express is which column changed: it lets any member
-- write any column, and deleting data is a management action (the permission
-- matrix in lib/org-permissions.ts puts response:delete with study:delete,
-- owner and admin only). A trigger is the one place that distinction can be
-- enforced in the database, so the API route's check is not the only thing
-- standing between a member and the delete.
create or replace function public.guard_response_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only a change to deleted_at is guarded. Every other update on the row
  -- (lead status, assignment, notes, the HubSpot bookkeeping) stays open to
  -- any member, exactly as before.
  if new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;

  -- Service-role callers (the seed route, background jobs) have no JWT role
  -- claim to check and are already trusted; has_org_role answers false for
  -- them, so they are let through explicitly rather than by accident.
  if auth.uid() is null then
    return new;
  end if;

  if not public.has_org_role(old.org_id, array['owner','admin']::public.org_role[]) then
    raise exception 'Only an owner or admin can delete or restore a response'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_response_soft_delete on public.responses;
create trigger guard_response_soft_delete
  before update of deleted_at on public.responses
  for each row
  execute function public.guard_response_soft_delete();
