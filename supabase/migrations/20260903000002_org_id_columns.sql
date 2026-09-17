-- Organization + membership layer, part C of F: org_id on every org-scoped
-- table.
--
-- Nullable here; part D backfills and then sets NOT NULL. user_id is not
-- dropped, renamed or altered on any of these: it stays as "who created this
-- record" and nothing reads it for authorization after part F.
--
-- The org-scoped tables, from the Phase 0 inventory:
--   surveys        — per-user via user_id + surveys_owner_all
--   responses      — per-user via user_id (denormalized from the survey by
--                    the set_response_user_id trigger) + responses_owner_all
--   profiles       — the company profile / settings row, keyed on user_id
--   survey_reports — per-user via user_id + survey_reports_owner_all
--
-- Deliberately NOT org-scoped:
--   auth_events    — a per-user signup/login audit log. Its signup row is
--                    written by a trigger on auth.users, i.e. before any
--                    organization for that user can exist, so a NOT NULL
--                    org_id is structurally impossible here. It is a record
--                    of the user's own sessions, not of the org's data.
--   roadmap_items  — shared across every admin by design, no user_id.
--   agent_runs     — service-role-only observability log, no user_id.
--   research_subscribers — public mailing list, no user_id.

alter table public.surveys
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;
create index if not exists surveys_org_id_idx on public.surveys (org_id);

alter table public.responses
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;
create index if not exists responses_org_id_idx on public.responses (org_id);

alter table public.profiles
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;
-- One company profile per organization. profiles.user_id stays the primary
-- key (untouched), but the row is the org's settings row now, and every read
-- of it is by org_id. Unique rather than plain index so a second member can
-- never create a competing profile for the same org.
create unique index if not exists profiles_org_id_key on public.profiles (org_id);

alter table public.survey_reports
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;
create index if not exists survey_reports_org_id_idx on public.survey_reports (org_id);
