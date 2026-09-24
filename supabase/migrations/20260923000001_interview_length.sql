-- Interview length as a preset, and the moment an interview finished.
--
-- surveys.interview_length replaces num_questions as what paces an
-- interview: short (about 5 minutes), standard (about 10), deep (about
-- 15). Each preset maps to a topic count and a follow-up allowance in
-- lib/studies/interview-length.ts, which is the only place those numbers
-- live. num_questions stays for history; nothing paces on it after this.
--
-- Backfilled from the count each study used to promise: 6 or fewer
-- questions read as short, 7 to 10 as standard, 11 or more as deep. A study
-- with no count keeps the default.
--
-- responses.completed_at is written by the completion path from here on
-- and is deliberately not backfilled: created_at is the interview's start,
-- and there is no honest way to recover when an old one ended. The study
-- page reports a median time once enough rows carry both.

alter table public.surveys
  add column if not exists interview_length text not null default 'standard';

alter table public.surveys drop constraint if exists surveys_interview_length_check;
alter table public.surveys
  add constraint surveys_interview_length_check
  check (interview_length in ('short', 'standard', 'deep'));

update public.surveys
   set interview_length = case
     when num_questions is null then 'standard'
     when num_questions <= 6 then 'short'
     when num_questions <= 10 then 'standard'
     else 'deep'
   end;

comment on column public.surveys.interview_length is
  'Length preset that paces the interview: short, standard or deep. See lib/studies/interview-length.ts for what each means.';

alter table public.responses add column if not exists completed_at timestamptz;

comment on column public.responses.completed_at is
  'When the interview completed. NULL for rows finished before this column existed and for interviews still in progress.';
