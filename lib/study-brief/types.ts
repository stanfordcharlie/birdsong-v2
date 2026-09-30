import { isInterviewLength, type InterviewLength } from "@/lib/studies/interview-length";
import { normalizeGiftCardBrand } from "@/lib/studies/incentive";
import { slugify } from "@/lib/studies/slugify";

// The study brief the conversational new study page builds.
//
// Every field here is something the form wizard (components/NewStudyWizard)
// already collects, under a name that says what it is to the admin. Where
// each one lands on the study record is in ./mapToStudy.

export type StudyBrief = {
  /** surveys.title. For the admin's own reference. */
  internalName: string;
  /** surveys.external_title. What a respondent sees. */
  externalTitle: string;
  /** surveys.sponsor. */
  sponsor: string;
  /** surveys.target_job_title. */
  audienceRoles: string;
  /** surveys.target_company_size. */
  audienceCompanies: string;
  /** surveys.target_industry. Optional, as it is in the wizard's brief. */
  audienceIndustry: string;
  /** What they want to learn. Feeds the guide; kept in the transcript. */
  researchQuestion: string;
  /** surveys.topic. What the study is publicly about. */
  topic: string;
  /** surveys.qualification_criteria, one signal per line. */
  signals: string[];
  /** No column of its own: a labeled section of surveys.question_guide. */
  offLimits: string;
  /** surveys.public_description. Optional. */
  publicDescription: string;
  /** surveys.interview_length. Null until chosen; the default applies. */
  length: InterviewLength | null;
  /** surveys.gift_card_amount. Null until answered, 0 for no gift. */
  giftAmount: number | null;
  /** surveys.gift_card_brand. Only stored with an amount. */
  giftBrand: string | null;
};

export const BRIEF_FIELD_KEYS = [
  "internalName",
  "externalTitle",
  "sponsor",
  "audienceRoles",
  "audienceCompanies",
  "audienceIndustry",
  "researchQuestion",
  "topic",
  "signals",
  "offLimits",
  "publicDescription",
  "length",
  "giftAmount",
  "giftBrand",
] as const satisfies readonly (keyof StudyBrief)[];

export type BriefFieldKey = (typeof BRIEF_FIELD_KEYS)[number];

export function isBriefFieldKey(value: unknown): value is BriefFieldKey {
  return typeof value === "string" && (BRIEF_FIELD_KEYS as readonly string[]).includes(value);
}

export const EMPTY_BRIEF: StudyBrief = {
  internalName: "",
  externalTitle: "",
  sponsor: "",
  audienceRoles: "",
  audienceCompanies: "",
  audienceIndustry: "",
  researchQuestion: "",
  topic: "",
  signals: [],
  offLimits: "",
  publicDescription: "",
  length: null,
  giftAmount: null,
  giftBrand: null,
};

/**
 * What the wizard will not create a study without: its two names, and the
 * six brief fields its chat requires before it drafts a guide
 * (REQUIRED_BRIEF_FIELDS in lib/brief/types.ts). The slug is the third thing
 * the wizard requires; it is derived from the title, so a title that
 * slugifies to nothing is caught by isReadyToCreate below.
 */
export const REQUIRED_TO_CREATE = [
  "internalName",
  "externalTitle",
  "sponsor",
  "audienceRoles",
  "audienceCompanies",
  "researchQuestion",
  "topic",
  "signals",
] as const satisfies readonly BriefFieldKey[];

/**
 * What the conversation asks about before it stops: everything required,
 * then the three choices it offers as quick replies. Those three have
 * defaults on the study, so they never hold Create back.
 */
export const ASKED_IN_CONVERSATION = [
  ...REQUIRED_TO_CREATE,
  "offLimits",
  "length",
  "giftAmount",
] as const satisfies readonly BriefFieldKey[];

export function isFieldFilled(brief: StudyBrief, key: BriefFieldKey): boolean {
  const value = brief[key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export function missingFields(brief: StudyBrief, keys: readonly BriefFieldKey[]): BriefFieldKey[] {
  return keys.filter((key) => !isFieldFilled(brief, key));
}

/** True once the wizard's own requirements are met, slug included. */
export function isReadyToCreate(brief: StudyBrief, slug: string | null = null): boolean {
  if (missingFields(brief, REQUIRED_TO_CREATE).length > 0) return false;
  return slugify(slug ?? brief.externalTitle).length > 0;
}

export function isConversationComplete(brief: StudyBrief): boolean {
  return missingFields(brief, ASKED_IN_CONVERSATION).length === 0;
}

// ---------------------------------------------------------------------------
// Value rules. One per field, used for the model's patch and for a brief
// arriving from the browser alike, so neither can put a shape on the brief
// that the study record would not take.

const TEXT_MAX = 2000;
const LINE_MAX = 200;
export const SIGNALS_MAX = 6;
export const GIFT_AMOUNT_MAX = 10000;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, max).trim();
}

/**
 * One signal per line, or per semicolon where there are no line breaks. A
 * sentence with neither stays whole: it is one signal.
 */
function splitSignals(value: string): string[] {
  const lines = value.split(/\r?\n+/).filter((line) => line.trim().length > 0);
  const parts = lines.length > 1 ? lines : value.split(";");
  return parts.map((part) => part.replace(/^\s*[-*\u2022]\s*/, ""));
}

/**
 * The value as the brief should hold it, or undefined when it is not a
 * usable value for that field.
 */
export function coerceFieldValue<K extends BriefFieldKey>(key: K, value: unknown): StudyBrief[K] | undefined;
export function coerceFieldValue(key: BriefFieldKey, value: unknown): StudyBrief[BriefFieldKey] | undefined {
  switch (key) {
    case "internalName":
    case "externalTitle":
    case "sponsor":
      return text(value, LINE_MAX);
    case "audienceRoles":
    case "audienceCompanies":
    case "audienceIndustry":
    case "researchQuestion":
    case "topic":
    case "offLimits":
    case "publicDescription":
      return text(value, TEXT_MAX);
    case "signals": {
      // The brief holds one signal per item, which is what the model is
      // asked for and usually sends. A single string arrives often enough
      // (one signal, or several on their own lines) that it is normalized
      // here rather than thrown away: the field is what the right rail's
      // "What makes someone worth a call" card reads, and losing an answer
      // to a shape is worse than splitting it.
      const items = typeof value === "string" ? splitSignals(value) : value;
      if (!Array.isArray(items)) return undefined;
      return items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, LINE_MAX).trim())
        .filter((item) => item.length > 0)
        .slice(0, SIGNALS_MAX);
    }
    case "length":
      if (value === null) return null;
      return isInterviewLength(value) ? value : undefined;
    case "giftAmount": {
      if (value === null) return null;
      if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
      if (value < 0 || value > GIFT_AMOUNT_MAX) return undefined;
      return Math.round(value);
    }
    case "giftBrand":
      if (value === null) return null;
      return typeof value === "string" ? normalizeGiftCardBrand(value) : undefined;
  }
}

/** A brief from an untrusted source: unknown keys dropped, bad values left empty. */
export function sanitizeBrief(raw: unknown): StudyBrief {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const brief: StudyBrief = { ...EMPTY_BRIEF, signals: [] };
  for (const key of BRIEF_FIELD_KEYS) {
    const value = coerceFieldValue(key, source[key]);
    if (value !== undefined) (brief as Record<BriefFieldKey, unknown>)[key] = value;
  }
  return brief;
}

/** Where the Home launcher leaves the text it was given, for the page to pick up. */
export const LAUNCHER_SEED_KEY = "birdsong:new-study:seed";

export const DRAFT_KEY_PREFIX = "birdsong:new-study:draft:";
