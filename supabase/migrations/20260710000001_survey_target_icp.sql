-- The survey creator's new conversational setup collects a per-survey
-- target ICP (which can differ from the admin's own company-wide ICP in
-- profiles.target_icp), stored as three separate fields since the
-- extraction tool and the form both work with them individually rather
-- than as one blob. Not run yet — review, then apply with
-- `supabase db push` or the SQL editor.

alter table public.surveys add column if not exists target_industry text;
alter table public.surveys add column if not exists target_job_title text;
alter table public.surveys add column if not exists target_company_size text;
