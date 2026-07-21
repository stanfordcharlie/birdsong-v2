-- Source tagging: which channel a respondent came from (?src= on the
-- shared survey URL — in-app popup, an email blast, paid ads, etc.), so
-- starts/completions can be broken down by channel on the survey detail
-- page. Nullable: null is the default for organic/untagged traffic (no
-- ?src= present, or one that sanitized down to nothing).
--
-- Not run yet, review then apply with `supabase db push` or the SQL
-- editor.

alter table public.responses add column if not exists source text;
