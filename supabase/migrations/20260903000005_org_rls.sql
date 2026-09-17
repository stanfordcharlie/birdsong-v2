-- Organization + membership layer, part F of F: RLS rewrite.
--
-- Drops the four per-user "owner_all" policies and replaces them with
-- org-membership policies. Reads: any authenticated member of the row's org.
-- Writes: owner + admin, except responses, which every member may update
-- (the lead queue is the SDR's whole job).
--
-- PRESERVED UNCHANGED, on purpose (the respondent flow and the public
-- research library depend on them):
--   surveys.surveys_public_read              select using (true)
--   responses.responses_public_insert        insert with check (survey exists)
--   survey_reports.survey_reports_public_read select published + publish_public
--   storage.objects company_logos_*          logo bucket policies
--   auth_events.*, roadmap_items.*           not org-scoped
--
-- Consequence of keeping surveys_public_read: RLS alone cannot scope survey
-- READS for an authenticated user (anyone can read any survey row). Every
-- survey list/lookup in the app therefore carries an explicit
-- .eq("org_id", ...) filter, exactly as it carried .eq("user_id", ...)
-- before. Writes on surveys are fully scoped by the policies below.

-- ---------------------------------------------------------------- surveys
drop policy if exists "surveys_owner_all" on public.surveys;

create policy "org members read surveys" on public.surveys
for select to authenticated
using (org_id in (select public.user_org_ids()));

create policy "org admins insert surveys" on public.surveys
for insert to authenticated
with check (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

create policy "org admins update surveys" on public.surveys
for update to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]))
with check (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

create policy "org admins delete surveys" on public.surveys
for delete to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

-- -------------------------------------------------------------- responses
-- responses_public_insert is left exactly as created in the init migration.
drop policy if exists "responses_owner_all" on public.responses;

create policy "org members read responses" on public.responses
for select to authenticated
using (org_id in (select public.user_org_ids()));

create policy "org members update responses" on public.responses
for update to authenticated
using (org_id in (select public.user_org_ids()))
with check (org_id in (select public.user_org_ids()));

create policy "org admins delete responses" on public.responses
for delete to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

-- --------------------------------------------------------------- profiles
drop policy if exists "profiles_owner_all" on public.profiles;

create policy "org members read profiles" on public.profiles
for select to authenticated
using (org_id in (select public.user_org_ids()));

create policy "org admins insert profiles" on public.profiles
for insert to authenticated
with check (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

create policy "org admins update profiles" on public.profiles
for update to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]))
with check (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

create policy "org admins delete profiles" on public.profiles
for delete to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

-- --------------------------------------------------------- survey_reports
-- survey_reports_public_read is left exactly as created in
-- 20260902000000_public_research_library.sql.
drop policy if exists "survey_reports_owner_all" on public.survey_reports;

create policy "org members read survey_reports" on public.survey_reports
for select to authenticated
using (org_id in (select public.user_org_ids()));

create policy "org admins insert survey_reports" on public.survey_reports
for insert to authenticated
with check (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

create policy "org admins update survey_reports" on public.survey_reports
for update to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]))
with check (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

create policy "org admins delete survey_reports" on public.survey_reports
for delete to authenticated
using (public.has_org_role(org_id, array['owner','admin']::public.org_role[]));

-- ---------------------------------------------------------- organizations
-- No insert or delete policy: service-role only.
create policy "org members read organizations" on public.organizations
for select to authenticated
using (id in (select public.user_org_ids()));

create policy "org admins update organizations" on public.organizations
for update to authenticated
using (public.has_org_role(id, array['owner','admin']::public.org_role[]))
with check (public.has_org_role(id, array['owner','admin']::public.org_role[]));

-- ------------------------------------------------------------ org_members
-- Select only: members can see their teammates. No insert/update/delete
-- policy at all, so membership and roles can only change through
-- service-role server code, never from the browser.
create policy "org members read org_members" on public.org_members
for select to authenticated
using (org_id in (select public.user_org_ids()));
