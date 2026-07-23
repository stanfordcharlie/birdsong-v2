-- Company fit-scoring: a separate assessment from the existing respondent
-- lead_score. lead_score (from lib/interview/extract.ts) answers "did this
-- person show real pain?" from the transcript. These columns answer "is this
-- company worth calling?" — the fit-scoring agent (lib/interview/company-fit.ts)
-- researches the respondent's employer on the web and scores it against the
-- sponsor's ICP. Purely additive; does not touch lead_score / pain_points /
-- call_script / fit_reason.
--
-- fit_confidence is plain text holding one of: 'high' | 'medium' | 'low' |
-- 'unavailable'. NULL means "not yet scored"; 'unavailable' is the distinct
-- terminal state for a run that errored, so a row is never ambiguous between
-- the two. fit_score is 1-10 when scored, NULL when unavailable.
alter table public.responses add column if not exists fit_score integer;
alter table public.responses add column if not exists fit_reasoning text;
alter table public.responses add column if not exists fit_confidence text;

comment on column public.responses.fit_score is 'Company-vs-sponsor-ICP fit, 1-10. NULL when fit_confidence is unavailable or not yet scored.';
comment on column public.responses.fit_reasoning is 'One to two sentence, evidence-based rationale for fit_score from the company-fit agent.';
comment on column public.responses.fit_confidence is 'high | medium | low | unavailable. NULL = not yet scored; unavailable = the agent errored.';
