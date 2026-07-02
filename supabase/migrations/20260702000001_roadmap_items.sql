-- Internal roadmap tracking, shared across all admins (no per-user
-- ownership: it's one team's shared view of what's built). Not run yet —
-- review, then apply with `supabase db push` or the SQL editor.

create table if not exists public.roadmap_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text not null default 'planned' check (status in ('done', 'in_progress', 'planned')),
  category      text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

alter table public.roadmap_items enable row level security;

-- Shared internal tracking: any signed-in admin can read and update it.
create policy "roadmap_items_authenticated_all"
  on public.roadmap_items
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

insert into public.roadmap_items (title, description, status, category, completed_at) values
  ('Next.js + Supabase project scaffold', 'Initial app scaffold with Next.js, Tailwind, and Supabase wired up.', 'done', 'core engine', now()),
  ('Interview engine', 'Claude-powered conversational interview via /api/interview/start and /continue, with evasiveness detection, hard exchange cutoff, and lead scoring.', 'done', 'core engine', now()),
  ('Respondent-facing chat UI', 'Public /survey/[slug] flow: intro form, live chat, progress bar, thank-you screen.', 'done', 'respondent flow', now()),
  ('Admin login', 'Supabase Auth email/password login gating /admin routes via middleware.', 'done', 'auth', now()),
  ('Admin survey detail/responses view', 'Per-survey response table with expandable transcript, pain points, and lead score.', 'done', 'admin', now()),
  ('Response persistence verified', 'Confirmed the service-role client is used correctly for unauthenticated respondent writes; added structured logging.', 'done', 'core engine', now()),
  ('Chat UI legibility fix', 'Removed a stray dark-mode CSS override that made chat bubbles unreadable.', 'done', 'respondent flow', now()),
  ('Admin surveys list page', 'Dashboard listing the logged-in admin''s own surveys, explicitly filtered by owner.', 'done', 'admin', now()),
  ('Resend email notifications', 'Email to the survey owner when an interview completes, with lead score, pain points, and an admin link.', 'done', 'core engine', now()),
  ('Expanded survey builder', 'Required field validation, respondent info fields (phone/job title/company), and question_guide used as a real research brief.', 'done', 'admin', now()),
  ('Admin signup + company profile', 'Signup flow and a company profile (what you sell, target ICP, value prop).', 'in_progress', 'auth', null),
  ('Abandoned interview handling', 'Detect and visually flag incomplete/abandoned interviews in admin.', 'planned', 'respondent flow', null),
  ('Survey builder UI polish', 'Design pass on the admin survey creation/edit form.', 'planned', 'admin', null),
  ('Report generation from responses', 'Summarized/exportable reports across a survey''s responses.', 'planned', 'admin', null),
  ('CRM integration for lead routing', 'Push hot leads into a CRM automatically.', 'planned', 'core engine', null);
