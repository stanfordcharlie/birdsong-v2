import { describe, expect, it } from "vitest";
import { INTERVIEW_LENGTH_PRESETS } from "@/lib/studies/interview-length";
import { clampTopic, interviewPacing } from "./pacing";
import type { InterviewMessage } from "./types";

const short = INTERVIEW_LENGTH_PRESETS.short; // 4 topics, 1 follow-up

function q(topic: number): InterviewMessage {
  return { role: "assistant", content: "?", topic };
}
const a: InterviewMessage = { role: "user", content: "..." };

describe("interviewPacing", () => {
  it("starts on topic 1 with nothing asked", () => {
    expect(interviewPacing([], short)).toMatchObject({ exchangeCount: 0, topic: 1, questionsOnTopic: 0, done: false });
  });

  it("reads the current topic and how much of it is spent", () => {
    const history = [q(1), a, q(1), a, q(2), a];
    expect(interviewPacing(history, short)).toMatchObject({ exchangeCount: 3, topic: 2, questionsOnTopic: 1, done: false });
  });

  it("is done once the last topic has its opening question and every follow-up", () => {
    const history = [q(1), a, q(2), a, q(3), a, q(4), a, q(4), a];
    expect(interviewPacing(history, short).done).toBe(true);
    expect(interviewPacing(history.slice(0, -2), short).done).toBe(false);
  });

  it("treats a transcript without topics as topic 1 throughout", () => {
    const history: InterviewMessage[] = [{ role: "assistant", content: "?" }, a, { role: "assistant", content: "?" }, a];
    expect(interviewPacing(history, short)).toMatchObject({ topic: 1, questionsOnTopic: 2, done: false });
  });
});

describe("clampTopic", () => {
  it("keeps the previous topic when the marker is missing", () => {
    expect(clampTopic(3, null, 6)).toBe(3);
  });

  it("allows staying or stepping forward by one, never more", () => {
    expect(clampTopic(3, 3, 6)).toBe(3);
    expect(clampTopic(3, 4, 6)).toBe(4);
    expect(clampTopic(3, 6, 6)).toBe(4);
  });

  it("never goes back and never passes the total", () => {
    expect(clampTopic(3, 1, 6)).toBe(3);
    expect(clampTopic(6, 7, 6)).toBe(6);
    expect(clampTopic(6, null, 6)).toBe(6);
  });
});
