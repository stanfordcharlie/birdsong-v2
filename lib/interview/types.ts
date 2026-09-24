export type InterviewMessage = {
  role: "user" | "assistant";
  content: string;
  /**
   * The question guide topic (1-based) an interviewer message belongs to,
   * as the model reported it in its ||TOPIC: n|| marker and the server
   * clamped it. Drives pacing and the respondent's progress bar. Absent on
   * respondent messages and on transcripts stored before topics existed.
   */
  topic?: number;
};
