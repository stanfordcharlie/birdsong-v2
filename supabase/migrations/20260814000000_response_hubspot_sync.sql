-- HubSpot sync bookkeeping. The sync itself runs fire-and-forget after an
-- interview completes (app/api/interview/continue/route.ts), so these columns
-- are the only record of whether it actually landed: without them a failed
-- sync is invisible and a retry would create a duplicate deal.
--
-- All three are NULL for every response that predates the integration, for
-- test runs, and for any response whose sync failed. hubspot_deal_id stays
-- NULL for leads below the deal-creation score threshold even when the
-- contact synced fine, so contact_id present + deal_id NULL is a normal
-- terminal state, not a partial failure.
--
-- Text rather than bigint: HubSpot object IDs are numeric today but the API
-- returns them as strings and treats them as opaque.
alter table public.responses add column if not exists hubspot_contact_id text;
alter table public.responses add column if not exists hubspot_deal_id text;
alter table public.responses add column if not exists hubspot_synced_at timestamptz;

comment on column public.responses.hubspot_contact_id is 'HubSpot contact object ID this response synced to. NULL = never synced.';
comment on column public.responses.hubspot_deal_id is 'HubSpot deal object ID created for this lead. NULL = below the deal threshold or not synced.';
comment on column public.responses.hubspot_synced_at is 'Timestamp of the last successful HubSpot sync for this response.';
