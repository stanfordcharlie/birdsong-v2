import type { InterviewMessage } from "./types";
import type { InterviewLengthPreset } from "@/lib/studies/interview-length";

// Where the interview is, counted in topics.
//
// An interview covers the preset's topic count from the question guide, in
// order, with a bounded number of follow-ups per topic. Every interviewer
// message in the stored transcript carries the topic it belonged to (the
// ||TOPIC: n|| marker, clamped by clampTopic), so the current position is
// read straight off the history: the topic of the last question and how
// many questions have been spent on it. The prompt paces against this, the
// continue route wraps on it, and the respondent's progress bar shows it.
//
// A transcript from before topics existed has no markers; every such
// message reads as topic 1, which keeps an old interview running to the
// model's own wrap-up under the exchange cap rather than ending it early.

export type InterviewPacing = {
  /** Respondent answers so far: user turns in the transcript. */
  exchangeCount: number;
  totalTopics: number;
  maxFollowUps: number;
  /** The topic the last question belonged to; 1 before anything is asked. */
  topic: number;
  /** Questions asked on that topic so far; 0 before the opening question. */
  questionsOnTopic: number;
  /** The last topic has had its opening question and every follow-up. */
  done: boolean;
};

export function interviewPacing(history: InterviewMessage[], preset: InterviewLengthPreset): InterviewPacing {
  const questions = history.filter((m) => m.role === "assistant");
  const exchangeCount = history.filter((m) => m.role === "user").length;
  const last = questions[questions.length - 1];
  const topic = last ? topicOf(last) : 1;
  const questionsOnTopic = last ? questions.filter((m) => topicOf(m) === topic).length : 0;
  const done = topic >= preset.topics && questionsOnTopic >= 1 + preset.maxFollowUps;
  return {
    exchangeCount,
    totalTopics: preset.topics,
    maxFollowUps: preset.maxFollowUps,
    topic,
    questionsOnTopic,
    done,
  };
}

function topicOf(message: InterviewMessage): number {
  return typeof message.topic === "number" && message.topic >= 1 ? message.topic : 1;
}

/**
 * The topic to record for a new question, given what the model reported.
 * A missing or unreadable marker keeps the previous topic (a follow-up),
 * so the bar never advances on a guess. The model may stay or step forward
 * by one; it can neither skip ahead nor go back, and never past the total.
 */
export function clampTopic(previous: number, reported: number | null | undefined, total: number): number {
  const floor = Math.max(1, previous);
  if (reported == null) return Math.min(floor, total);
  return Math.min(Math.max(floor, Math.min(reported, floor + 1)), total);
}
