export type SurveyOnboardingMessage = {
  role: "user" | "assistant";
  content: string;
};

// The three tone buckets the conversational setup normalizes the admin's
// answer into (both the extraction tool schema and the resulting form's
// select share this list).
export const SURVEY_TONE_OPTIONS = ["Conversational", "Peer-to-peer", "Academic"] as const;
export type SurveyTone = (typeof SURVEY_TONE_OPTIONS)[number];

export type ExtractedSurveyDetails = {
  topic: string;
  targetIndustry: string;
  targetJobTitle: string;
  targetCompanySize: string;
  tone: SurveyTone;
  numQuestions: number;
  questionGuide: string;
};
