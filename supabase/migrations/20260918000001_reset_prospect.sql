-- Reset a prospect back to pending after a test click.
--
-- Opening a prospect's personal link and pressing Start creates a
-- responses row and stamps prospects.started_at, so from then on that link
-- resumes the tester's abandoned session instead of starting clean for the
-- real person. This function is the one place that undoes that, in one
-- transaction: the linked response rows go (lead_activity cascades,
-- agent_runs.response_id nulls, per their own foreign keys), and the
-- prospect returns to pending with both stamps cleared.
--
-- Hard delete on purpose: this is test cleanup, not an audit trail. Two
-- refusals, because a finished interview is real data and a HubSpot push
-- means someone downstream already has it:
--   completed_response  a linked response has completed = true
--   hubspot_synced      a linked response carries a HubSpot id
-- Both raise, so nothing is deleted on either path.
--
-- Not exposed to the API roles. The route (app/api/prospects/[id]/reset)
-- checks that the caller's organization owns the prospect's study and then
-- calls this with the service role. An anon or authenticated caller cannot
-- reach it directly.

create or replace function public.reset_prospect(p_prospect_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect public.prospects%rowtype;
  v_completed integer;
  v_synced integer;
  v_deleted integer;
begin
  select * into v_prospect from public.prospects where id = p_prospect_id for update;
  if not found then
    raise exception 'prospect_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_completed
    from public.responses
   where prospect_id = p_prospect_id and completed = true;
  if v_completed > 0 then
    raise exception 'completed_response' using errcode = 'P0001';
  end if;

  select count(*) into v_synced
    from public.responses
   where prospect_id = p_prospect_id
     and (hubspot_contact_id is not null or hubspot_deal_id is not null or hubspot_synced_at is not null);
  if v_synced > 0 then
    raise exception 'hubspot_synced' using errcode = 'P0001';
  end if;

  delete from public.responses where prospect_id = p_prospect_id;
  get diagnostics v_deleted = row_count;

  update public.prospects
     set started_at = null,
         completed_at = null,
         status = 'pending'
   where id = p_prospect_id;

  return jsonb_build_object('deleted_responses', v_deleted);
end;
$$;

revoke all on function public.reset_prospect(uuid) from public;
revoke all on function public.reset_prospect(uuid) from anon;
revoke all on function public.reset_prospect(uuid) from authenticated;
grant execute on function public.reset_prospect(uuid) to service_role;
