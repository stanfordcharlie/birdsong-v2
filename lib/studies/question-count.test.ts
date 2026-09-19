import { describe, expect, it } from "vitest";
import {
  QUESTION_COUNT_DEFAULT,
  QUESTION_COUNT_FLOOR_MESSAGE,
  QUESTION_COUNT_SHORT_MESSAGE,
  questionCountIssue,
} from "./question-count";

describe("questionCountIssue", () => {
  it("blocks anything under 6, and non-numbers", () => {
    expect(questionCountIssue("5")).toEqual({ kind: "blocked", message: QUESTION_COUNT_FLOOR_MESSAGE });
    expect(questionCountIssue(0)).toEqual({ kind: "blocked", message: QUESTION_COUNT_FLOOR_MESSAGE });
    expect(questionCountIssue("")).toEqual({ kind: "blocked", message: QUESTION_COUNT_FLOOR_MESSAGE });
    expect(questionCountIssue("ten")).toEqual({ kind: "blocked", message: QUESTION_COUNT_FLOOR_MESSAGE });
    expect(questionCountIssue("6.5")).toEqual({ kind: "blocked", message: QUESTION_COUNT_FLOOR_MESSAGE });
  });

  it("warns at 6 and 7 without blocking", () => {
    expect(questionCountIssue("6")).toEqual({ kind: "warning", message: QUESTION_COUNT_SHORT_MESSAGE });
    expect(questionCountIssue(7)).toEqual({ kind: "warning", message: QUESTION_COUNT_SHORT_MESSAGE });
  });

  it("is silent from 8 up, including the default and above the recommended range", () => {
    expect(questionCountIssue("8")).toBeNull();
    expect(questionCountIssue(QUESTION_COUNT_DEFAULT)).toBeNull();
    expect(questionCountIssue(12)).toBeNull();
    expect(questionCountIssue(15)).toBeNull();
  });
});
