import { describe, expect, it } from "vitest";
import { questionSegments, splitQuestion, stripBold } from "./split-question";

describe("splitQuestion", () => {
  it("splits a greeting from the opening question", () => {
    const result = splitQuestion(
      "Hi Test, thanks for taking the time to chat about how leads move through your systems at Example. When a new inbound lead comes in, how does it actually **get to the right rep**?"
    );
    expect(result.lead).toBe(
      "Hi Test, thanks for taking the time to chat about how leads move through your systems at Example."
    );
    expect(result.question).toBe(
      "When a new inbound lead comes in, how does it actually **get to the right rep**?"
    );
  });

  it("splits a restatement from the question that follows it", () => {
    const result = splitQuestion(
      "So the SLA came and went without ever really sticking. Who **actually fixes it** when the data is off?"
    );
    expect(result.lead).toBe("So the SLA came and went without ever really sticking.");
    expect(result.question).toBe("Who **actually fixes it** when the data is off?");
  });

  it("keeps a multi-sentence question together once it starts", () => {
    const result = splitQuestion(
      "Got it. Walk me through **the handoff**. What happens first?"
    );
    expect(result.lead).toBe("Got it.");
    expect(result.question).toBe("Walk me through **the handoff**. What happens first?");
  });

  it("renders a single-sentence message entirely as the question", () => {
    const result = splitQuestion("How often does a lead end up with **the wrong owner**?");
    expect(result.lead).toBeNull();
    expect(result.question).toBe("How often does a lead end up with **the wrong owner**?");
  });

  it("does not split when the bold phrase sits in the first sentence", () => {
    const text = "Tell me about **the routing rules**. Anything unusual there?";
    const result = splitQuestion(text);
    expect(result.lead).toBeNull();
    expect(result.question).toBe(text);
  });

  it("falls back to the first question mark when nothing is bolded", () => {
    const result = splitQuestion("Okay, so still mostly manual then. How long does that usually take?");
    expect(result.lead).toBe("Okay, so still mostly manual then.");
    expect(result.question).toBe("How long does that usually take?");
  });

  it("uses a paragraph break over sentence boundaries", () => {
    const result = splitQuestion("Thanks, that helps. Two things there.\n\nWhich one **hurts more** day to day?");
    expect(result.lead).toBe("Thanks, that helps. Two things there.");
    expect(result.question).toBe("Which one **hurts more** day to day?");
  });

  it("leaves a message with no question and no bold whole", () => {
    const text = "Tell me more about that. Take your time.";
    const result = splitQuestion(text);
    expect(result.lead).toBeNull();
    expect(result.question).toBe(text);
  });

  it("handles empty input", () => {
    expect(splitQuestion("   ")).toEqual({ lead: null, question: "" });
  });
});

describe("questionSegments", () => {
  it("separates the highlight from its surroundings", () => {
    expect(questionSegments("How does it **get to the right rep**?")).toEqual({
      pre: "How does it ",
      highlight: "get to the right rep",
      post: "?",
    });
  });

  it("returns no highlight for a plain question", () => {
    expect(questionSegments("How does it get there?")).toEqual({
      pre: "How does it get there?",
      highlight: null,
      post: "",
    });
  });

  it("only highlights the first bold run and flattens the rest", () => {
    expect(questionSegments("Is it **manual** or **automatic**?")).toEqual({
      pre: "Is it ",
      highlight: "manual",
      post: " or automatic?",
    });
  });
});

describe("stripBold", () => {
  it("removes markers", () => {
    expect(stripBold("a **b** c")).toBe("a b c");
  });
});
