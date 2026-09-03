-- Organization + membership layer, part D of F: backfill.
--
-- One organization per existing auth user, that user as its owner, and every
-- row they created stamped with the new org. Runs as one DO block so a
-- failure anywhere rolls the whole thing back, and asserts at the end that
-- nothing was left behind before the columns go NOT NULL.
--
-- Safe to re-run: a user who already has a membership is skipped, and only
-- rows whose org_id is still null are touched.

do $$
declare
  u           record;
  new_org_id  uuid;
  local_part  text;
  org_name    text;
  base_slug   text;
  org_slug    text;
  first_name  text;
  remaining   integer;
begin
  for u in
    select id, email, raw_user_meta_data
    from auth.users
    where not exists (select 1 from public.org_members m where m.user_id = auth.users.id)
    order by created_at
  loop
    local_part := coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'workspace');
    first_name := nullif(trim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), '');

    -- "Charlie's Workspace": the first name from signup metadata when it
    -- exists, otherwise the email local-part with its first letter upper-cased.
    org_name := coalesce(first_name, upper(left(local_part, 1)) || substr(local_part, 2)) || '''s Workspace';

    -- Sanitized local-part plus a short uuid suffix so two users named
    -- "charlie" at different domains never collide.
    base_slug := regexp_replace(lower(local_part), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then base_slug := 'workspace'; end if;
    org_slug := base_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);

    insert into public.organizations (name, slug, created_by)
    values (org_name, org_slug, u.id)
    returning id into new_org_id;

    insert into public.org_members (org_id, user_id, role)
    values (new_org_id, u.id, 'owner');

    update public.surveys        set org_id = new_org_id where user_id = u.id and org_id is null;
    update public.responses      set org_id = new_org_id where user_id = u.id and org_id is null;
    update public.profiles       set org_id = new_org_id where user_id = u.id and org_id is null;
    update public.survey_reports set org_id = new_org_id where user_id = u.id and org_id is null;
  end loop;

  -- A user who already had a membership before this ran (re-run case) may
  -- still own unstamped rows: stamp them with that user's first org.
  update public.surveys s set org_id = m.org_id
    from public.org_members m where m.user_id = s.user_id and s.org_id is null;
  update public.responses r set org_id = m.org_id
    from public.org_members m where m.user_id = r.user_id and r.org_id is null;
  update public.profiles p set org_id = m.org_id
    from public.org_members m where m.user_id = p.user_id and p.org_id is null;
  update public.survey_reports sr set org_id = m.org_id
    from public.org_members m where m.user_id = sr.user_id and sr.org_id is null;

  -- Nothing may be left unscoped. Raising here aborts the migration rather
  -- than letting NOT NULL below fail with a less useful message, or worse,
  -- letting a row silently fall outside every organization.
  select count(*) into remaining from public.surveys where org_id is null;
  if remaining > 0 then
    raise exception 'org backfill: % surveys still have null org_id', remaining;
  end if;
  select count(*) into remaining from public.responses where org_id is null;
  if remaining > 0 then
    raise exception 'org backfill: % responses still have null org_id', remaining;
  end if;
  select count(*) into remaining from public.profiles where org_id is null;
  if remaining > 0 then
    raise exception 'org backfill: % profiles still have null org_id', remaining;
  end if;
  select count(*) into remaining from public.survey_reports where org_id is null;
  if remaining > 0 then
    raise exception 'org backfill: % survey_reports still have null org_id', remaining;
  end if;
end
$$;

alter table public.surveys        alter column org_id set not null;
alter table public.responses      alter column org_id set not null;
alter table public.profiles       alter column org_id set not null;
alter table public.survey_reports alter column org_id set not null;
