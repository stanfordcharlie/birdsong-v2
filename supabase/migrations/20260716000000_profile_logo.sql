-- Lets an admin upload a company logo, shown on the respondent-facing
-- survey intro when a sponsor is set. Not run yet, review then apply with
-- `supabase db push` or the SQL editor.

alter table public.profiles add column if not exists logo_url text;

-- Public bucket: respondents view the logo unauthenticated, so reads must
-- work without a session. Uploads are still gated to the owning admin below.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

drop policy if exists "company_logos_public_read" on storage.objects;
create policy "company_logos_public_read"
  on storage.objects
  for select
  using (bucket_id = 'company-logos');

-- Objects are stored as `<user_id>/<filename>`, so the first path segment
-- must match the uploader's own auth.uid() for every write.
drop policy if exists "company_logos_owner_write" on storage.objects;
create policy "company_logos_owner_write"
  on storage.objects
  for insert
  with check (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "company_logos_owner_update" on storage.objects;
create policy "company_logos_owner_update"
  on storage.objects
  for update
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "company_logos_owner_delete" on storage.objects;
create policy "company_logos_owner_delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
