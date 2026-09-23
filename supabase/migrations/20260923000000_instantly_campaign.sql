-- Instantly: take a prospect out of their email sequence once they have
-- finished the interview.
--
-- Prospects reach a study through Instantly campaigns (the CSV export is
-- built for its uploader). Once someone completes, the follow-up emails in
-- that campaign are noise at best, so the completion path moves them to a
-- "completed" list in Instantly. Moved, never deleted: deleting a lead
-- destroys its history there.
--
-- surveys.instantly_campaign_id maps a study to its one campaign. Set by
-- hand in the dashboard; there is no UI for it. NULL means the study is not
-- run through Instantly and the completion path does nothing.
--
-- The three prospect columns record what happened, so the roster can show
-- it and a failure can be fixed by hand in Instantly:
--   instantly_removed_at  set on success; also the idempotency guard
--   instantly_job_id      the background job Instantly returned, if any
--   instantly_error       short status + body on failure, cleared on success
-- No retries and no queue: one attempt at completion, then a person.

alter table public.surveys add column if not exists instantly_campaign_id text;

comment on column public.surveys.instantly_campaign_id is
  'Instantly campaign this study''s prospects are emailed from. NULL = not run through Instantly; completion skips the move.';

alter table public.prospects
  add column if not exists instantly_removed_at timestamptz,
  add column if not exists instantly_job_id text,
  add column if not exists instantly_error text;

comment on column public.prospects.instantly_removed_at is
  'When the prospect was moved out of the Instantly campaign after completing. NULL = not moved (never attempted, skipped, or failed: see instantly_error).';
comment on column public.prospects.instantly_job_id is
  'Background job id Instantly returned for the move, when it returned one.';
comment on column public.prospects.instantly_error is
  'Why the last move attempt failed (status + response body, truncated). Cleared on success.';
