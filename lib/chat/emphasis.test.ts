import { describe, expect, it } from "vitest";
import { emphasisSegments, extractEmphasis } from "./emphasis";

describe("emphasisSegments", () => {
  it("bolds an exact match in place", () => {
    expect(emphasisSegments("Who actually fixes it when the data is off?", "actually fixes it")).toEqual([
      { text: "Who ", bold: false },
      { text: "actually fixes it", bold: true },
      { text: " when the data is off?", bold: false },
    ]);
  });

  it("matches across a case difference and keeps the text's own casing", () => {
    expect(emphasisSegments("What does the record show?", "The Record")).toEqual([
      { text: "What does ", bold: false },
      { text: "the record", bold: true },
      { text: " show?", bold: false },
    ]);
  });

  it("matches across a punctuation difference", () => {
    expect(emphasisSegments("Tell me what the record, exactly, shows.", "what the record exactly shows")).toEqual([
      { text: "Tell me ", bold: false },
      { text: "what the record, exactly, shows", bold: true },
      { text: ".", bold: false },
    ]);
  });

  it("matches across extra whitespace", () => {
    expect(emphasisSegments("How do you  route\nemergency calls?", "route emergency  calls")).toEqual([
      { text: "How do you  ", bold: false },
      { text: "route\nemergency calls", bold: true },
      { text: "?", bold: false },
    ]);
  });

  it("renders plain text when the phrase is not in the question", () => {
    expect(emphasisSegments("What does a BDR see when they open a record?", "what the record shows")).toEqual([
      { text: "What does a BDR see when they open a record?", bold: false },
    ]);
  });

  it("renders plain text for an empty or missing phrase", () => {
    expect(emphasisSegments("What happens first?", "")).toEqual([{ text: "What happens first?", bold: false }]);
    expect(emphasisSegments("What happens first?", "  ")).toEqual([{ text: "What happens first?", bold: false }]);
    expect(emphasisSegments("What happens first?", null)).toEqual([{ text: "What happens first?", bold: false }]);
    expect(emphasisSegments("", "phrase")).toEqual([]);
  });

  it("bolds only the first of two occurrences", () => {
    expect(emphasisSegments("Is the handoff manual, and who owns the handoff?", "the handoff")).toEqual([
      { text: "Is ", bold: false },
      { text: "the handoff", bold: true },
      { text: " manual, and who owns the handoff?", bold: false },
    ]);
  });

  it("does not match inside a longer word", () => {
    expect(emphasisSegments("Do they bathe records in the CRM?", "the record")).toEqual([
      { text: "Do they bathe records in the CRM?", bold: false },
    ]);
  });
});

describe("extractEmphasis", () => {
  it("keeps an inline phrase and strips the markers", () => {
    const result = extractEmphasis("Got it. Walk me through **the handoff**. What happens first?");
    expect(result.phrase).toBe("the handoff");
    expect(result.message).toBe("Got it. Walk me through **the handoff**. What happens first?");
    expect(result.text).toBe("Got it. Walk me through the handoff. What happens first?");
  });

  it("drops a phrase that stands alone as its own paragraph", () => {
    const result = extractEmphasis(
      "When a BDR opens a record, what do they actually see?\n\n**what the record shows**"
    );
    expect(result.phrase).toBe("what the record shows");
    expect(result.message).toBe("When a BDR opens a record, what do they actually see?");
    expect(result.text).toBe("When a BDR opens a record, what do they actually see?");
  });

  it("drops a phrase that trails the last sentence on the same line", () => {
    const result = extractEmphasis("When a BDR opens a record, what do they actually see? **what the record shows**.");
    expect(result.phrase).toBe("what the record shows");
    expect(result.text).toBe("When a BDR opens a record, what do they actually see?");
  });

  it("returns no phrase for a message without markers", () => {
    expect(extractEmphasis("What happens first?")).toEqual({
      message: "What happens first?",
      text: "What happens first?",
      phrase: null,
    });
  });

  it("takes the first phrase and strips any further markers", () => {
    const result = extractEmphasis("Is **the handoff** manual, or does **the CRM** do it?");
    expect(result.phrase).toBe("the handoff");
    expect(result.text).toBe("Is the handoff manual, or does the CRM do it?");
  });
});
