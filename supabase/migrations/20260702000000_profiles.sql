-- Company profile, 1:1 with auth.users. Not run yet — review, then apply
-- with `supabase db push` or the SQL editor.

create table if not exists public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  company_name  text,
  what_we_sell  text,
  target_icp    text,
  value_prop    text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can only ever see or edit their own profile row.
create policy "profiles_owner_all"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
