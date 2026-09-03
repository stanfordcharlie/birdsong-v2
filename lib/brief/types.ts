export type BriefMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * What the brief chat exists to extract. Every field here is required to
 * terminate the chat, which is what makes termination deterministic rather
 * than a judgment call the model makes.
 */
export type ExtractedBrief = {
  /** Roles and job titles they sell to. */
  icpRoles: string;
  /** Company profile: size, stage, shape. */
  icpCompanyProfile: string;
  icpIndustry: string;
  /** The genuine research question, internal. */
  researchQuestion: string;
  /** What the study is publicly about, as a respondent would see it. */
  publicTopic: string;
  sponsorName: string;
  /** How they want to be credited to respondents. */
  sponsorCredit: string;
  /**
   * What makes someone worth a sales conversation for them. Captured and
   * stored on the study; nothing in this build reads it.
   */
  qualificationCriteria: string;
};

export const REQUIRED_BRIEF_FIELDS = [
  "icpRoles",
  "icpCompanyProfile",
  "researchQuestion",
  "publicTopic",
  "sponsorName",
  "qualificationCriteria",
] as const satisfies readonly (keyof ExtractedBrief)[];

/** True once every required field has real content, not a placeholder. */
export function isBriefComplete(brief: ExtractedBrief): boolean {
  return REQUIRED_BRIEF_FIELDS.every((field) => brief[field].trim().length > 0);
}

export function missingBriefFields(brief: ExtractedBrief): string[] {
  return REQUIRED_BRIEF_FIELDS.filter((field) => brief[field].trim().length === 0);
}
