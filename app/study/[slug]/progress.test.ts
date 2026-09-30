import { describe, expect, it } from "vitest";
import { HOLD_PERCENT, interviewProgressPercent } from "./progress";

// The standard preset's six topics, which is what most studies run.
const TARGET = 6;

describe("interviewProgressPercent", () => {
  it("is empty before the first question", () => {
    expect(interviewProgressPercent(0, TARGET, false)).toBe(0);
  });

  it("moves on every question, which is the whole point", () => {
    const seen = [1, 2, 3, 4, 5].map((n) => interviewProgressPercent(n, TARGET, false));
    expect(seen).toEqual([15, 30, 45, 60, 75]);
    // Strictly increasing: the bar the old topic marker left sitting on step
    // one now advances every time a question renders.
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  it("holds short of the end while follow-ups keep coming", () => {
    expect(interviewProgressPercent(TARGET, TARGET, false)).toBe(HOLD_PERCENT);
    expect(interviewProgressPercent(TARGET + 5, TARGET, false)).toBe(HOLD_PERCENT);
    expect(interviewProgressPercent(99, TARGET, false)).toBe(HOLD_PERCENT);
  });

  it("fills on completion, however few questions it took", () => {
    // The early wrap-up after evasive answers ends the interview at whatever
    // question it happens on, and the bar still finishes.
    expect(interviewProgressPercent(2, TARGET, true)).toBe(100);
    expect(interviewProgressPercent(0, TARGET, true)).toBe(100);
    expect(interviewProgressPercent(99, TARGET, true)).toBe(100);
  });

  it("never moves backward as questions accumulate", () => {
    for (const target of [4, 6, 8]) {
      let previous = 0;
      for (let asked = 0; asked <= 30; asked++) {
        const value = interviewProgressPercent(asked, target, false);
        expect(value).toBeGreaterThanOrEqual(previous);
        expect(value).toBeLessThanOrEqual(HOLD_PERCENT);
        previous = value;
      }
    }
  });

  it("holds up against a nonsense length rather than dividing by zero", () => {
    expect(interviewProgressPercent(1, 0, false)).toBe(HOLD_PERCENT);
    expect(interviewProgressPercent(1, -3, false)).toBe(HOLD_PERCENT);
    expect(interviewProgressPercent(-2, TARGET, false)).toBe(0);
  });
});
