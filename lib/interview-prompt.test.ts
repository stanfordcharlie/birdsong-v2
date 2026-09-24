import { describe, expect, it } from "vitest";
import { buildInterviewSystemPrompt, COMPLETE_TOKEN, MAX_EXCHANGES } from "./interview-prompt";
import { interviewPacing } from "./interview/pacing";
import { INTERVIEW_LENGTH_PRESETS } from "./studies/interview-length";
import type { InterviewMessage } from "./interview/types";
import type { Database } from "@/types/database";

type Survey = Database["public"]["Tables"]["surveys"]["Row"];

function survey(): Survey {
  return {
    id: "s1",
    title: "Lead routing",
    tone: "Academic",
    num_questions: 12,
    interview_length: "standard",
  } as unknown as Survey;
}

function q(topic: number): InterviewMessage {
  return { role: "assistant", content: "?", topic };
}
const a: InterviewMessage = { role: "user", content: "..." };

describe("buildInterviewSystemPrompt", () => {
  it("paces in topics from the preset, not in questions", () => {
    const prompt = buildInterviewSystemPrompt({ survey: survey(), pacing: interviewPacing([], INTERVIEW_LENGTH_PRESETS.standard) });
    expect(prompt).toContain("covers 6 topics");
    expect(prompt).toContain("at most 2 follow-ups");
    expect(prompt).toContain("your first question opens topic 1");
    expect(prompt).toContain("||TOPIC: 1||");
    expect(prompt).toContain(`topic 6 of 6`);
    expect(prompt).toContain(COMPLETE_TOKEN);
    expect(prompt).not.toContain("questions long");
    expect(prompt).not.toContain("12");
  });

  it("tells the model where it is and what it may do next", () => {
    const history = [q(1), a, q(1), a, q(2), a];
    const prompt = buildInterviewSystemPrompt({ survey: survey(), pacing: interviewPacing(history, INTERVIEW_LENGTH_PRESETS.short) });
    expect(prompt).toContain("Your last question was on topic 2 of 4, with 1 follow-up still available on it. Your next question either follows up on topic 2 or opens topic 3.");
    expect(prompt).toContain("||TOPIC: 2|| for the current topic or ||TOPIC: 3|| for the next");
  });

  it("says when the follow-ups on a topic are spent", () => {
    const history = [q(1), a, q(1), a];
    const prompt = buildInterviewSystemPrompt({ survey: survey(), pacing: interviewPacing(history, INTERVIEW_LENGTH_PRESETS.short) });
    expect(prompt).toContain("used its last follow-up, so your next question opens topic 2");
  });

  it("never reads the survey's tone", () => {
    const prompt = buildInterviewSystemPrompt({ survey: survey(), pacing: interviewPacing([], INTERVIEW_LENGTH_PRESETS.deep) });
    expect(prompt).not.toContain("Academic");
    expect(prompt).not.toContain("Tone:");
    expect(prompt).toContain("curious peer");
  });

  it("carries the question style rules and the example", () => {
    const prompt = buildInterviewSystemPrompt({ survey: survey(), pacing: interviewPacing([], INTERVIEW_LENGTH_PRESETS.standard) });
    expect(prompt).toContain("under 25 words");
    expect(prompt).toContain("Never stack two asks");
    expect(prompt).toContain("their own words");
    expect(prompt).toContain("No jargon or labels the respondent has not used first");
    expect(prompt).toContain("Praise is not");
    expect(prompt).toContain('After: "When a BDR gets one of those leads, what do they look at first?"');
    expect(prompt).toContain("Never use em dashes");
    expect(prompt).toContain("three times in a row");
  });

  it("keeps the exchange cap", () => {
    expect(MAX_EXCHANGES).toBe(30);
  });
});
