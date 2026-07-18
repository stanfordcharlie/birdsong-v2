-- /api/interview/continue used to trust a bare response_id (a guessable,
-- enumerable UUID) as if it were a credential. This adds a random session
-- token, generated and stored at /api/interview/start, that continue now
-- requires and compares before doing anything else.
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses add column if not exists session_token text;
