/**
 * Copy and timing for the auto-playing interview demo.
 *
 * Everything the demo shows — the participant, the transcript, the four
 * signals, the fit score, the invite counts — is illustrative placeholder
 * content, not a real study. It is kept here rather than inline so that is
 * obvious in one place, and so the timeline arithmetic below sits next to the
 * arrays it indexes into.
 *
 * The timeline is 12 steps on a 1600ms interval, looping. The four stages do
 * not get equal time: recruiting is a single beat, the interview and the
 * listening each take four, and the routed end-state holds for three so it
 * is still on screen when the eye gets there.
 */

export type Stage = {
  tag: string;
  title: string;
  body: string;
  /** First step of this stage — also where a click on the row jumps to. */
  start: number;
  /** How many steps it runs for, which is what fills its progress bar. */
  length: number;
};

export const STAGES: Stage[] = [
  {
    tag: "Recruit",
    title: "Invite your market to a study",
    body: "Pick a topic your buyers care about. Birdsong recruits participants who match your ICP.",
    start: 0,
    length: 1,
  },
  {
    tag: "Interview",
    title: "An AI moderator runs the call",
    body: "Every participant gets a real interview, with follow-ups when an answer matters.",
    start: 1,
    length: 4,
  },
  {
    tag: "Listen",
    title: "Buying signals, in their words",
    body: "Pain, timing, role, and team size are pulled from the transcript as they talk.",
    start: 5,
    length: 4,
  },
  {
    tag: "Route",
    title: "Qualified leads go to sales",
    body: "Leads that fit land in your CRM, assigned to a rep with the full context.",
    start: 9,
    length: 3,
  },
];

export const STEP_COUNT = 12;
export const STEP_MS = 1600;

/** The step the reduced-motion build pins to: the routed end-state. */
export const ROUTED_STEP = 9;

/** Which stage row is lit for a given step. */
export function stageOf(step: number): number {
  return step === 0 ? 0 : step <= 4 ? 1 : step <= 8 ? 2 : 3;
}

export const MESSAGES: { ai: boolean; text: string }[] = [
  { ai: true, text: "Thanks for joining the study. What's slowing your pipeline down most right now?" },
  { ai: false, text: "Lead quality. Reps spend half their week on accounts that never convert." },
  { ai: true, text: "How are you handling that today?" },
  { ai: false, text: "Spreadsheets and gut feel. We need something live before Q1 planning." },
];

export const SIGNALS: [string, string][] = [
  ["Pain", "Low-quality leads"],
  ["Timeline", "Before Q1"],
  ["Role", "VP Revenue"],
  ["Team", "40 reps"],
];

export const PARTICIPANT = "Maya R. · VP Revenue, Northwind Logistics";
export const PARTICIPANT_INITIALS = "MR";

export const INVITE = {
  kicker: "You're invited to a research study",
  title: "How revenue teams are rethinking outbound in 2027",
  meta: ["8 minutes", "Voice or chat", "Findings shared with you"],
  cta: "Start interview",
  counts: "312 invited · 47 completed",
};

export const ROUTED_NOTE = "Assigned to Jordan in Salesforce, with transcript and summary";
export const SCORING_NOTE = "Scoring against your ICP";
export const SIGNALS_EMPTY = "Listening for pain, timing, and authority…";

/** The two halves of the typing indicator, alternating by step parity. */
export const TYPING = ["Birdsong is asking a follow-up", "Maya is answering"];
