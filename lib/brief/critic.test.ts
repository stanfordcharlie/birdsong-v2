import { describe, expect, it } from "vitest";
import { MAX_THEME_ATTEMPTS, lexicalFailures, retryTheme, themeFailures, type QuestionVerdict } from "./critic";
import type { GuideTheme } from "@/lib/studies/guide";

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

describe("retryTheme", () => {
  const draft = (opening: string): GuideTheme => ({
    theme: "Dispatch today",
    research_intent: "How work is assigned now.",
    signal: "context",
    opening_question: opening,
    probes: ["Who was involved?", "What did you check first?"],
    quantification_probe: "How many times did that happen last month?",
  });
  const verdict = (themeIndex: number, failures: string[]): QuestionVerdict => ({
    id: `t${themeIndex}.opening`,
    themeIndex,
    themeLabel: "Dispatch today",
    slot: "opening",
    question: "q",
    pass: failures.length === 0,
    failures,
  });
  const CLEAN = draft("Walk me through the last time a job was reassigned.");
  const BAD = draft("How does your team handle scheduling problems?");

  it("makes no redraft or review call for a theme that cleared on attempt 1", async () => {
    let calls = 0;
    const result = await retryTheme({
      themeIndex: 0,
      themeLabel: "Dispatch today",
      initialTheme: CLEAN,
      initialVerdicts: [verdict(0, [])],
      redraft: async () => {
        calls++;
        return CLEAN;
      },
      review: async () => {
        calls++;
        return [verdict(0, [])];
      },
      requestId: "test",
    });
    expect(calls).toBe(0);
    expect(result).toMatchObject({ cleared: true, attempts: 1, kept: 1 });
  });

  it("passes the verbatim critique into the redraft and stops on the first clear pass", async () => {
    const seen: string[][] = [];
    const result = await retryTheme({
      themeIndex: 2,
      themeLabel: "Dispatch today",
      initialTheme: BAD,
      initialVerdicts: [verdict(2, ["Presupposed problem: assumes scheduling goes wrong."])],
      redraft: async (history) => {
        seen.push(history[history.length - 1].critique);
        return CLEAN;
      },
      review: async () => [verdict(2, [])],
      requestId: "test",
    });
    expect(seen).toEqual([["opening: Presupposed problem: assumes scheduling goes wrong."]]);
    expect(result).toMatchObject({ cleared: true, attempts: 2, kept: 2, theme: CLEAN });
  });

  it("carries every prior attempt and its critique into the next redraft", async () => {
    const histories: { attempt: number; critique: string[] }[][] = [];
    const reviews = [["Leading framing: presumes a preference."], []];
    await retryTheme({
      themeIndex: 1,
      themeLabel: "Dispatch today",
      initialTheme: BAD,
      initialVerdicts: [verdict(1, ["Presupposed problem."])],
      redraft: async (history) => {
        histories.push(history.map((h) => ({ attempt: h.attempt, critique: h.critique })));
        return draft(`Draft ${history.length + 1}`);
      },
      review: async () => [verdict(1, reviews.shift() ?? [])],
      requestId: "test",
    });
    expect(histories).toHaveLength(2);
    expect(histories[1]).toEqual([
      { attempt: 1, critique: ["opening: Presupposed problem."] },
      { attempt: 2, critique: ["opening: Leading framing: presumes a preference."] },
    ]);
  });

  it("stops after three attempts and keeps the least-flagged draft, flagged", async () => {
    let redrafts = 0;
    const reviews = [["a", "b", "c"], ["a"]];
    const result = await retryTheme({
      themeIndex: 0,
      themeLabel: "Dispatch today",
      initialTheme: BAD,
      initialVerdicts: [verdict(0, ["x", "y"])],
      redraft: async () => {
        redrafts++;
        return draft(`Draft ${redrafts + 1}`);
      },
      review: async () => [verdict(0, reviews.shift() ?? [])],
      requestId: "test",
    });
    expect(redrafts).toBe(MAX_THEME_ATTEMPTS - 1);
    expect(result.cleared).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.kept).toBe(3);
    expect(result.critique).toEqual(["opening: a"]);
  });

  it("counts an unparseable or throwing redraft as a failed attempt, not a crash", async () => {
    let redrafts = 0;
    const result = await retryTheme({
      themeIndex: 0,
      themeLabel: "Dispatch today",
      initialTheme: BAD,
      initialVerdicts: [verdict(0, ["x"])],
      redraft: async () => {
        redrafts++;
        if (redrafts === 1) throw new Error("model exploded");
        return null;
      },
      review: async () => {
        throw new Error("review must not run on a missing draft");
      },
      requestId: "test",
    });
    expect(redrafts).toBe(2);
    expect(result).toMatchObject({ cleared: false, attempts: 3, kept: 1, theme: BAD, critique: ["opening: x"] });
  });
});
