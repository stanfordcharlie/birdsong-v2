-- Backs the redesigned multi-step company profile setup flow. Not run yet,
-- review then apply with `supabase db push` or the SQL editor.

alter table public.profiles
  add column if not exists industry text,
  add column if not exists team_size text,
  add column if not exists website text,
  add column if not exists linkedin text,
  add column if not exists tone text,
  add column if not exists words_to_avoid text,
  add column if not exists contact_name text,
  add column if not exists contact_email text;

-- Every field now autosaves individually as the admin fills the wizard in
-- (rather than the old one-shot save at the very end), so "does this
-- profile have any data" no longer means "setup is finished" the way it
-- did before: a profile can have a company name saved from a half-done
-- session. This column is the explicit completion marker the setup flow
-- sets on "Finish setup", and is what decides whether ProfileGate shows
-- the wizard or the completed static view.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;
