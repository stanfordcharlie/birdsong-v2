-- Public research library (usebirdsong.com/reports).
--
-- Two independent gates, deliberately not one flag:
--   survey_reports.published  — the report is finished and shown to the
--                               customer in their own admin view.
--   surveys.publish_public    — this study's report may additionally appear
--                               in the public Birdsong library.
-- A report can be published to its customer without ever being public, which
-- is the common case. The library requires BOTH.
--
-- publish_public lives on surveys, not survey_reports, because regeneration
-- inserts a NEW survey_reports row (see 20260718000004). Keeping the public
-- consent on the study means regenerating a report cannot silently
-- un-publish the library entry, and a customer's decision to go public is
-- made once about the study rather than again about every draft.

alter table public.survey_reports
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz;

alter table public.surveys
  add column if not exists publish_public boolean not null default false;

-- The library reads by survey slug and orders by publish date, and the
-- sitemap enumerates every public report. Partial index because the public
-- set is a small fraction of all reports.
create index if not exists survey_reports_published_idx
  on public.survey_reports (published_at desc)
  where published;

-- Anonymous read, scoped to exactly the rows the library may show.
--
-- This is RLS rather than a service-role read in the server component on
-- purpose: the service role bypasses RLS entirely, so a single forgotten
-- .eq("published", true) in any future caller would serve an unpublished
-- customer report to the open internet. Expressing the gate as a policy
-- makes the database itself the thing that refuses, so the public pages can
-- use the ordinary anon client and a mistake in application code fails
-- closed. surveys is already world-readable (surveys_public_read, added in
-- the init migration for the respondent survey-start flow), so joining to it
-- here does not widen anything.
drop policy if exists "survey_reports_public_read" on public.survey_reports;
create policy "survey_reports_public_read"
  on public.survey_reports
  for select
  using (
    published
    and exists (
      select 1
      from public.surveys s
      where s.id = survey_reports.survey_id
        and s.publish_public
    )
  );

-- Research subscribers: one email per submission from the report pages.
-- Not a lead capture. Nothing here gates the report or a download.
create table if not exists public.research_subscribers (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  source_report_slug  text,
  created_at          timestamptz not null default now()
);

create unique index if not exists research_subscribers_email_key
  on public.research_subscribers (lower(email));

alter table public.research_subscribers enable row level security;

-- No policies at all, which is the point: with RLS enabled and nothing
-- granted, anon and authenticated can neither read nor write this table.
-- The subscribe route inserts with the service role, so the address list is
-- unreadable from the browser even with the anon key in hand.
