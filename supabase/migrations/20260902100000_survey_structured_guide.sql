-- Structured question guide, generated from a conversational brief.
--
-- surveys.question_guide (text) stays exactly as it is and stays the ONLY
-- thing lib/interview-prompt.ts reads. This migration adds the structured
-- source it is now derived from, so the guide can be rendered, edited and
-- regenerated theme by theme without the interview runtime having to learn
-- a new shape. Studies created before this column exists keep working:
-- guide_structured is null and question_guide is whatever free text they
-- were authored with. Nothing is backfilled.
alter table public.surveys add column if not exists guide_structured jsonb;

-- The raw brief chat that produced the guide. Kept so a guide can be
-- regenerated later from the same intake, and as the input to future
-- scoring work. Shape: [{ role: "user" | "assistant", content: string }].
alter table public.surveys add column if not exists brief_transcript jsonb;

-- What makes a respondent worth a sales conversation for this sponsor, in
-- their own words. Captured during the brief and stored only. Nothing reads
-- it in this build: lead scoring is deliberately untouched.
alter table public.surveys add column if not exists qualification_criteria text;

comment on column public.surveys.guide_structured is
  'Structured research guide: { themes: [...], recommended_title, recommended_topic, recommended_custom_fields }. question_guide is the derived text rendering of this and remains what the interview prompt reads.';
comment on column public.surveys.brief_transcript is
  'Raw brief chat transcript the guide was generated from.';
comment on column public.surveys.qualification_criteria is
  'Sponsor-defined description of a respondent worth a sales conversation. Stored, not consumed.';
