-- Organization + membership layer, part E of F: responses.org_id trigger.
--
-- Responses are created by the public, unauthenticated interview-start route
-- (and by the respondent's anon insert policy). That route must not be the
-- thing responsible for org scoping, so org_id is derived from the parent
-- survey here, the same way set_response_user_id already derives user_id.
--
-- Unconditional, not "if new.org_id is null": a response's org is a fact
-- about its survey, never something a caller gets to assert. With the
-- public insert policy in place, honoring a caller-supplied org_id would let
-- anyone holding the anon key file a response under a different org than
-- the survey it answers. Always overwriting makes an orphaned or misfiled
-- response structurally impossible.

create or replace function public.set_response_org_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select s.org_id into new.org_id
  from public.surveys s
  where s.id = new.survey_id;
  return new;
end
$$;

drop trigger if exists set_response_org_id on public.responses;
create trigger set_response_org_id
  before insert on public.responses
  for each row
  execute function public.set_response_org_id();
