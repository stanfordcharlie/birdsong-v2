// The three interview lengths, and everything each one means.
//
// A study picks one of these instead of a question count. The preset is
// the single source of truth for the promise the respondent is shown (the
// minutes), the number of topics the interviewer works through, and how
// many follow-ups it may spend on each. These are tuning values: change
// them here and the wizard, the edit form, the welcome screen, the progress
// bar, the prompt and the server's wrap-up all move together.
//
// A topic is one numbered item in the question guide, taken in order. The
// interview wraps after the preset's topic count whether or not the guide
// had more; the forms say so when it does. The 30-exchange hard cap in
// lib/interview-prompt.ts still sits above all of this.

export const INTERVIEW_LENGTHS = ["short", "standard", "deep"] as const;
export type InterviewLength = (typeof INTERVIEW_LENGTHS)[number];

export type InterviewLengthPreset = {
  value: InterviewLength;
  label: string;
  /** What the respondent is told, and what the median-time stat is checked against. */
  minutes: number;
  /** Question guide topics covered, in order. The progress bar's total. */
  topics: number;
  /** Follow-ups the interviewer may spend on one topic before moving on. */
  maxFollowUps: number;
};

export const INTERVIEW_LENGTH_PRESETS: Record<InterviewLength, InterviewLengthPreset> = {
  short: { value: "short", label: "Short", minutes: 5, topics: 4, maxFollowUps: 1 },
  standard: { value: "standard", label: "Standard", minutes: 10, topics: 6, maxFollowUps: 2 },
  deep: { value: "deep", label: "Deep", minutes: 15, topics: 8, maxFollowUps: 2 },
};

export const DEFAULT_INTERVIEW_LENGTH: InterviewLength = "standard";

export function isInterviewLength(value: unknown): value is InterviewLength {
  return typeof value === "string" && (INTERVIEW_LENGTHS as readonly string[]).includes(value);
}

/** The preset for a stored value; anything unrecognised reads as the default. */
export function interviewLengthPreset(value: string | null | undefined): InterviewLengthPreset {
  return INTERVIEW_LENGTH_PRESETS[isInterviewLength(value) ? value : DEFAULT_INTERVIEW_LENGTH];
}

/** "About 10 minutes": the one respondent-facing duration phrase. */
export function interviewDurationLabel(preset: InterviewLengthPreset): string {
  return `About ${preset.minutes} minutes`;
}

/** "Standard · about 10 min": the admin-facing summary of a preset. */
export function interviewLengthSummary(preset: InterviewLengthPreset): string {
  return `${preset.label} · about ${preset.minutes} min`;
}

// The guide is stored as text rendered by renderGuideToText
// (lib/studies/guide.ts): one numbered heading per theme, "1. Theme", at
// the start of a line. Counting those is how the edit form, which only has
// the text, learns how many topics the guide holds.
const NUMBERED_TOPIC_LINE = /^\s*\d+[.)]\s+\S/gm;

export function countGuideTopics(guideText: string | null | undefined): number {
  if (!guideText) return 0;
  return guideText.match(NUMBERED_TOPIC_LINE)?.length ?? 0;
}

/**
 * One plain line for the forms when the guide has more topics than the
 * preset will reach. Null when every topic is covered, so nothing renders.
 */
export function coverageAdvisory(preset: InterviewLengthPreset, guideTopics: number): string | null {
  if (guideTopics <= preset.topics) return null;
  return `Your guide has ${guideTopics} topics. A ${preset.label.toLowerCase()} interview covers the first ${preset.topics}.`;
}
