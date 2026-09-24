import { describe, expect, it } from "vitest";
import {
  INTERVIEW_LENGTH_PRESETS,
  countGuideTopics,
  coverageAdvisory,
  interviewDurationLabel,
  interviewLengthPreset,
  isInterviewLength,
} from "./interview-length";

describe("interviewLengthPreset", () => {
  it("resolves each stored value and falls back to standard", () => {
    expect(interviewLengthPreset("short").minutes).toBe(5);
    expect(interviewLengthPreset("deep").topics).toBe(8);
    expect(interviewLengthPreset(null)).toBe(INTERVIEW_LENGTH_PRESETS.standard);
    expect(interviewLengthPreset("bogus")).toBe(INTERVIEW_LENGTH_PRESETS.standard);
  });

  it("guards the stored value", () => {
    expect(isInterviewLength("standard")).toBe(true);
    expect(isInterviewLength("long")).toBe(false);
    expect(isInterviewLength(5)).toBe(false);
  });

  it("phrases the promise from the preset's minutes", () => {
    expect(interviewDurationLabel(INTERVIEW_LENGTH_PRESETS.short)).toBe("About 5 minutes");
  });
});

describe("countGuideTopics", () => {
  it("counts the numbered headings renderGuideToText writes", () => {
    const guide = [
      "1. Lead routing today",
      "   What to learn: who touches a lead first",
      "   Then go concrete: the CRM / the spreadsheet",
      "",
      "2. Handoffs",
      "   What to learn: where it breaks",
      "",
      "3. Tooling",
    ].join("\n");
    expect(countGuideTopics(guide)).toBe(3);
    expect(countGuideTopics("")).toBe(0);
    expect(countGuideTopics(null)).toBe(0);
  });
});

describe("coverageAdvisory", () => {
  it("says how many topics a shorter preset reaches", () => {
    expect(coverageAdvisory(INTERVIEW_LENGTH_PRESETS.short, 6)).toBe(
      "Your guide has 6 topics. A short interview covers the first 4."
    );
  });

  it("is silent when the guide fits", () => {
    expect(coverageAdvisory(INTERVIEW_LENGTH_PRESETS.standard, 6)).toBeNull();
    expect(coverageAdvisory(INTERVIEW_LENGTH_PRESETS.deep, 3)).toBeNull();
  });
});
