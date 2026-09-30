-- Where a prospect is in their Instantly sequence, learned from Instantly's
-- own webhook (app/api/webhooks/instantly/route.ts) rather than guessed.
--
-- Until now the roster could only say what Birdsong itself did: the invite
-- row exists (pending), they clicked (started), they finished (completed),
-- and the completion path moved them out of the campaign (instantly_removed_at).
-- Nothing recorded that Instantly had actually emailed them, so a prospect
-- sat at "Pending" through an entire sequence.
--
-- surveys.instantly_campaign_id already exists (20260923000000) and is what
-- the webhook matches a campaign to a study on, so nothing is added for it
-- here beyond an index: the webhook looks a study up by that column on every
-- event, and it is null for most studies.
create index if not exists surveys_instantly_campaign_idx
  on public.surveys (instantly_campaign_id)
  where instantly_campaign_id is not null;

-- The step number Instantly reported last. 1-based, as Instantly counts it.
-- Null means no send has been reported: either the study is not run through
-- Instantly, or the sequence has not reached this person yet.
alter table public.prospects
  add column if not exists sequence_step integer,
  add column if not exists last_sent_at timestamptz;

comment on column public.prospects.sequence_step is
  'Step of the Instantly sequence this prospect was last sent, as Instantly numbers them (1-based). NULL = no send reported.';
comment on column public.prospects.last_sent_at is
  'When Instantly last reported sending this prospect an email. The existing sent_at holds the first send instead, so the two together say "first touched" and "last touched".';

-- prospects.sent_at was created with the table (20260905000000) and has
-- never been written by anything. The webhook now fills it on the first
-- reported send and leaves it alone afterwards, which is what its name says,
-- while last_sent_at moves with every step.

-- No RLS change. The webhook is unauthenticated and runs with the service
-- role, which bypasses RLS entirely; its own shared-secret check is what
-- stands in front of it. The roster reads these two columns through the same
-- owner-scoped policies as every other prospect column.
