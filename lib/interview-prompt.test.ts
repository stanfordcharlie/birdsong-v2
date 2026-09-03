import { describe, expect, it } from "vitest";
import {
  buildInterviewSystemPrompt,
  COMPLETE_TOKEN,
  DEFAULT_QUESTION_COUNT,
  MAX_EXCHANGES,
  questionBudgetFor,
} from "./interview-prompt";
import type { Database } from "@/types/database";

type Survey = Database["public"]["Tables"]["surveys"]["Row"];

function surveyWith(numQuestions: number | null): Survey {
  return {
    id: "s1",
    title: "Lead routing",
    num_questions: numQuestions,
  } as unknown as Survey;
}

describe("questionBudgetFor", () => {
  it("is the survey's count, follow-ups included", () => {
    expect(questionBudgetFor(8)).toBe(8);
    expect(questionBudgetFor(3)).toBe(3);
  });

  it("falls back to the default when unset", () => {
    expect(questionBudgetFor(null)).toBe(DEFAULT_QUESTION_COUNT);
    expect(questionBudgetFor(undefined)).toBe(DEFAULT_QUESTION_COUNT);
  });

  it("never exceeds the hard ceiling and never drops below one", () => {
    expect(questionBudgetFor(500)).toBe(MAX_EXCHANGES);
    expect(questionBudgetFor(0)).toBe(1);
  });
});

describe("buildInterviewSystemPrompt", () => {
  it("states the exact total and the next question number", () => {
    const prompt = buildInterviewSystemPrompt({ survey: surveyWith(8), exchangeCount: 3 });
    expect(prompt).toContain("exactly 8 questions long");
    expect(prompt).toContain("answered 3 of 8");
    expect(prompt).toContain("question 4 of 8");
    expect(prompt).toContain(`answered question 8 of 8, the interview is over`);
    expect(prompt).toContain(COMPLETE_TOKEN);
  });

  it("never announces a next question past the total", () => {
    const prompt = buildInterviewSystemPrompt({ survey: surveyWith(8), exchangeCount: 8 });
    expect(prompt).toContain("you have 0 questions left");
    expect(prompt).toContain("question 8 of 8");
    expect(prompt).not.toContain("question 9 of 8");
  });
});
