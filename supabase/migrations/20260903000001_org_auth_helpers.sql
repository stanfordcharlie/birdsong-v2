-- Organization + membership layer, part B of F: authorization helpers.
--
-- Both are SECURITY DEFINER so a policy on surveys/responses/... that asks
-- "which orgs is the caller in" reads org_members without recursing into
-- org_members' own RLS. STABLE + empty search_path per the Supabase guidance
-- for definer functions; every reference inside is schema-qualified.
--
-- (select auth.uid()) rather than bare auth.uid(): the subselect makes it an
-- initPlan evaluated once per statement instead of once per row. Every policy
-- in part F uses the same shape.

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.org_members where user_id = (select auth.uid())
$$;

create or replace function public.has_org_role(
  target_org uuid,
  allowed public.org_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org
      and user_id = (select auth.uid())
      and role = any(allowed)
  )
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function by default, so the
-- revoke comes first and the grant is the only thing left standing.
revoke execute on function public.user_org_ids() from public, anon;
revoke execute on function public.has_org_role(uuid, public.org_role[]) from public, anon;
grant execute on function public.user_org_ids() to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;
