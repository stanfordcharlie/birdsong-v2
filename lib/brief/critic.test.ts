import { describe, expect, it } from "vitest";
import { lexicalFailures, themeFailures } from "./critic";
import type { GuideTheme } from "@/lib/surveys/guide";

describe("lexicalFailures", () => {
  it("passes a recency-anchored, open-ended opening", () => {
    expect(
      lexicalFailures(
        "Walk me through the last time an emergency call came in after hours.",
        "opening"
      )
    ).toEqual([]);
  });

  it("flags an opening with no recency anchor", () => {
    expect(
      lexicalFailures("How does your team assign jobs to technicians?", "opening")
    ).toContain("No recency anchor: does not point at a recent specific instance.");
  });

  it("flags a yes/no opener", () => {
    const failures = lexicalFailures("Did that delay change the rest of the day?", "probe");
    expect(failures.some((f) => f.includes('Opens with "did"'))).toBe(true);
  });

  it("flags banned vocabulary", () => {
    const failures = lexicalFailures("What is the biggest pain point in scheduling?", "probe");
    expect(failures.some((f) => f.includes("pain"))).toBe(true);
  });

  it("flags an em dash", () => {
    expect(
      lexicalFailures("Tell me about the last time — anything at all — that happened.", "probe")
    ).toContain("Contains an em dash or en dash.");
  });

  it("flags a trailing second question", () => {
    expect(lexicalFailures("Who found out about that delay, and how?", "probe")).toContain(
      "Reads as two questions joined into one."
    );
  });

  // The false positives that a looser version of the compound rule produced
  // three times in one verification run. A comma before an interrogative
  // word, and an "and when" inside a subordinate clause, are both ordinary
  // single questions.
  it("does not flag a comma before an interrogative mid-sentence", () => {
    expect(
      lexicalFailures(
        "For that specific call, how many people did you contact before the technician was on the road?",
        "quantification"
      )
    ).toEqual([]);
  });

  it("does not flag 'and when' inside a subordinate clause", () => {
    expect(
      lexicalFailures(
        "Roughly how long was the gap between when that call came in and when the technician arrived?",
        "quantification"
      )
    ).toEqual([]);
  });

  it("flags two question marks", () => {
    expect(
      lexicalFailures("What happened next? Who else noticed?", "probe")
    ).toContain("Compound question: more than one question mark.");
  });

  it("flags a quantification probe that asks for no number", () => {
    expect(
      lexicalFailures("What did that change about the rest of the day?", "quantification")
    ).toContain("Does not ask for a number.");
  });
});

describe("themeFailures", () => {
  const base: GuideTheme = {
    theme: "Dispatch today",
    research_intent: "How work is assigned now.",
    signal: "context",
    opening_question: "Walk me through the last time a job was reassigned.",
    probes: ["Who was involved?", "What did you check first?"],
    quantification_probe: "How many times did that happen last month?",
  };

  it("passes a complete theme", () => {
    expect(themeFailures(base)).toEqual([]);
  });

  it("flags a missing quantification probe", () => {
    expect(themeFailures({ ...base, quantification_probe: "  " })).toContain(
      "Missing the quantification probe."
    );
  });

  it("flags fewer than two probes", () => {
    expect(themeFailures({ ...base, probes: ["Who was involved?"] })).toContain(
      "Fewer than two probes."
    );
  });
});
