-- Lightweight signup/login activity log. Not run yet — review, then apply
-- with `supabase db push` or the SQL editor.

create table if not exists public.auth_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text,
  event_type  text not null check (event_type in ('signup', 'login')),
  created_at  timestamptz not null default now()
);

create index if not exists auth_events_user_id_idx on public.auth_events (user_id);

alter table public.auth_events enable row level security;

-- Users can see their own activity log.
create policy "auth_events_owner_select"
  on public.auth_events
  for select
  using (auth.uid() = user_id);

-- Client-side login logging inserts as the just-authenticated user.
create policy "auth_events_owner_insert"
  on public.auth_events
  for insert
  with check (auth.uid() = user_id);

-- Auto-log every new signup via a trigger rather than client-side code:
-- when email confirmation is required, signUp() returns no session, so
-- there's no authenticated client available yet to insert a row under RLS.
create or replace function public.log_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auth_events (user_id, email, event_type)
  values (new.id, new.email, 'signup');
  return new;
end;
$$;

drop trigger if exists log_auth_signup on auth.users;
create trigger log_auth_signup
  after insert on auth.users
  for each row
  execute function public.log_auth_signup();
