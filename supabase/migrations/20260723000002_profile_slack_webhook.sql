-- Optional per-account Slack incoming-webhook URL, alongside the existing
-- email lead notification. Lives on profiles since that's already the 1:1
-- per-user settings row (profiles_owner_all RLS already scopes it to its
-- owner; no policy change needed for an added column). NULL = Slack
-- notifications disabled for this account.
alter table public.profiles add column if not exists slack_webhook_url text;

comment on column public.profiles.slack_webhook_url is 'Slack incoming webhook URL (https://hooks.slack.com/...) for lead-completion notifications. NULL disables Slack notifications for this account.';
