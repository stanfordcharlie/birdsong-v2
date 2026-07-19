-- Marks the seeded demo survey (POST /api/sample-data) so removal can
-- target exactly the sample rows (is_sample + user_id) and never real
-- data. Sample surveys stay draft forever; their responses are is_test.

alter table public.surveys add column if not exists is_sample boolean not null default false;
