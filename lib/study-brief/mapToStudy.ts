import type { Json } from "@/types/database";
import type { BriefMessage, ExtractedBrief } from "@/lib/brief/types";
import { renderGuideToText, type StructuredGuide } from "@/lib/studies/guide";
import { DEFAULT_INTERVIEW_LENGTH } from "@/lib/studies/interview-length";
import { normalizeGiftCardBrand } from "@/lib/studies/incentive";
import {
  OPTIONAL_RESPONDENT_FIELDS,
  OPTIONAL_RESPONDENT_FIELD_LABELS,
  type CustomRespondentFieldDef,
} from "@/lib/studies/respondent-fields";
import type { StudyBrief } from "./types";

// The study brief, as the study record the form wizard writes.
//
// createSurvey in components/NewStudyWizard.tsx is the reference: the payload
// here has the same keys, in the same shapes, from the same sources. The
// interview engine reads surveys.question_guide and the columns beside it,
// and cannot tell which of the two pages made the row.

/** The wizard's insert payload, before slug, user_id and org_id are added. */
export type StudyPayload = {
  title: string;
  external_title: string;
  sponsor: string | null;
  public_description: string | null;
  topic: string | null;
  target_industry: string | null;
  target_job_title: string | null;
  target_company_size: string | null;
  guide_structured: Json;
  question_guide: string | null;
  brief_transcript: Json;
  qualification_criteria: string | null;
  interview_length: string;
  gift_card_amount: number | null;
  gift_card_brand: string | null;
  custom_fields: Json;
};

/**
 * The optional respondent fields the wizard has on by default: phone and job
 * title. Now only a fallback for a brief that was never asked (an older
 * draft, restored from storage before the question existed); a conversation
 * that reached the question answers it, even if the answer is "none".
 */
export const DEFAULT_RESPONDENT_FIELDS: CustomRespondentFieldDef[] = [
  { key: "phone", label: OPTIONAL_RESPONDENT_FIELD_LABELS.phone, required: false },
  { key: "job_title", label: OPTIONAL_RESPONDENT_FIELD_LABELS.job_title, required: false },
];

/**
 * The brief's answer as the study stores it. Null is the only thing that
 * falls back to the default: an empty array is the admin saying name and
 * work email are enough, and is carried through as the empty list it is.
 */
export function respondentFieldsFromBrief(brief: StudyBrief): CustomRespondentFieldDef[] {
  if (brief.respondentFields === null) return DEFAULT_RESPONDENT_FIELDS;
  return brief.respondentFields.map((key) => ({
    key,
    label: OPTIONAL_RESPONDENT_FIELD_LABELS[key],
    required: false,
  }));
}

/** One signal per line, numbered, which is how the card shows them. */
export function signalsToText(signals: readonly string[]): string {
  return signals.map((signal, i) => `${i + 1}. ${signal}`).join("\n");
}

const NOTHING_OFF_LIMITS = /^(nothing|none|no|n\/a)\b/i;

/** The off limits answer, or empty when the answer was that nothing is. */
export function offLimitsText(brief: Pick<StudyBrief, "offLimits">): string {
  const value = brief.offLimits.trim();
  return NOTHING_OFF_LIMITS.test(value) ? "" : value;
}

export const OFF_LIMITS_HEADING = "Off limits. Do not raise or name any of these:";

/**
 * The guide text the interview engine reads, with the off limits section
 * after the themes.
 *
 * The study record has no column for off limits, so it goes in the one text
 * field the interviewer already reads, under its own heading. The lines are
 * dashed rather than numbered on purpose: countGuideTopics
 * (lib/studies/interview-length.ts) counts numbered lines to learn how many
 * topics a guide has, and these are not topics.
 */
export function renderQuestionGuide(guide: StructuredGuide, brief: Pick<StudyBrief, "offLimits">): string {
  const themes = renderGuideToText(guide);
  const offLimits = offLimitsText(brief);
  if (!offLimits) return themes;

  const lines = offLimits
    .split(/\n+|;\s*/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((line) => `- ${line}`);
  return [themes, `${OFF_LIMITS_HEADING}\n${lines.join("\n")}`].filter(Boolean).join("\n\n");
}

/**
 * The brief in the shape the guide generator takes (/api/surveys/brief/guide),
 * which is the shape the wizard's own chat extracts.
 */
export function toExtractedBrief(brief: StudyBrief): ExtractedBrief {
  return {
    icpRoles: brief.audienceRoles,
    icpCompanyProfile: brief.audienceCompanies,
    icpIndustry: brief.audienceIndustry,
    researchQuestion: brief.researchQuestion,
    publicTopic: brief.topic,
    sponsorName: brief.sponsor,
    sponsorCredit: "",
    qualificationCriteria: signalsToText(brief.signals),
  };
}

export function mapToStudy({
  brief,
  guide,
  transcript,
  respondentFields,
}: {
  brief: StudyBrief;
  /** Drafted from toExtractedBrief(brief) by the existing guide route. */
  guide: StructuredGuide;
  /** The conversation, stored so the guide can be redrafted from it later. */
  transcript: BriefMessage[];
  /**
   * The optional respondent fields that are switched on. Taken from the
   * brief's own answer when the caller does not override it.
   */
  respondentFields?: CustomRespondentFieldDef[];
}): StudyPayload {
  const chosenFields = respondentFields ?? respondentFieldsFromBrief(brief);
  const extracted = toExtractedBrief(brief);

  // The guide's recommended fields join the list the way the wizard adds
  // them when the guide arrives: optional, and never twice.
  //
  // With one limit the wizard never needed. The guide recommends by key, and
  // some of its recommendations are the presets themselves ("phone"), so a
  // guide drafted before the admin was asked could put back the very field
  // they had just declined. A preset the conversation did not choose is
  // dropped here; anything the guide invented for this study still lands.
  const taken = new Set(chosenFields.map((field) => field.key));
  const declined = new Set<string>(
    brief.respondentFields === null
      ? []
      : OPTIONAL_RESPONDENT_FIELDS.filter((key) => !brief.respondentFields!.includes(key))
  );
  const recommended = (guide.recommended_custom_fields ?? [])
    .filter((field) => !taken.has(field.key) && !declined.has(field.key))
    .map((field) => ({ key: field.key, label: field.label, required: false }));

  const hasGift = typeof brief.giftAmount === "number" && brief.giftAmount > 0;

  return {
    title: brief.internalName,
    external_title: brief.externalTitle,
    sponsor: brief.sponsor || null,
    public_description: brief.publicDescription || null,
    topic: guide.recommended_topic || extracted.publicTopic || null,
    target_industry: extracted.icpIndustry || null,
    target_job_title: extracted.icpRoles || null,
    target_company_size: extracted.icpCompanyProfile || null,
    guide_structured: guide as unknown as Json,
    question_guide: renderQuestionGuide(guide, brief) || null,
    brief_transcript: transcript as unknown as Json,
    qualification_criteria: extracted.qualificationCriteria || null,
    interview_length: brief.length ?? DEFAULT_INTERVIEW_LENGTH,
    gift_card_amount: hasGift ? brief.giftAmount : null,
    gift_card_brand: hasGift ? normalizeGiftCardBrand(brief.giftBrand) : null,
    custom_fields: [...chosenFields, ...recommended] as Json,
  };
}
