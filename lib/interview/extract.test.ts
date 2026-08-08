import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { extractToolInput } from "@/lib/interview/extract";

// Plain response-shaped fixtures, not a mocked SDK: extractToolInput only
// reads result.content, so nothing here needs a client or a network call.
function message(content: unknown[]): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content,
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as Anthropic.Message;
}

function toolUse(input: Record<string, unknown>): Anthropic.Message {
  return message([{ type: "tool_use", id: "toolu_test", name: "record_interview_insights", input }]);
}

const VALID_INPUT = {
  pain_points: ["after-hours calls get missed"],
  lead_score: 8,
  fit_reason: "Runs the dispatch workflow this product replaces.",
  summary: "Ops lead at a 40-tech shop, routes emergency calls by phone.",
  call_script: {
    opener: "You mentioned two dispatchers on weekends.",
    talking_points: [
      { said: "we keep two dispatchers on weekends", angle: "automated on-call routing replaces that" },
      { said: "invoices go out three weeks late", angle: "job-to-invoice flow removes the re-keying" },
    ],
  },
};

describe("extractToolInput", () => {
  describe("valid input", () => {
    it("returns the tool input unchanged", () => {
      expect(extractToolInput(toolUse(VALID_INPUT))).toEqual(VALID_INPUT);
    });

    it("accepts the boundary scores 1 and 10", () => {
      expect(extractToolInput(toolUse({ ...VALID_INPUT, lead_score: 1 }))).not.toBeNull();
      expect(extractToolInput(toolUse({ ...VALID_INPUT, lead_score: 10 }))).not.toBeNull();
    });

    it("accepts an empty talking_points array, since only its type is checked", () => {
      const input = { ...VALID_INPUT, call_script: { opener: "hi", talking_points: [] } };

      expect(extractToolInput(toolUse(input))).not.toBeNull();
    });

    // This validator gates on the array's type, not its element shape, so a
    // flat legacy array still passes here. That is deliberate: parseCallScript
    // reads both shapes downstream, so an old-shaped payload is normalized
    // rather than thrown away as a failed extraction.
    it("accepts flat legacy talking_points alongside the paired shape", () => {
      const input = { ...VALID_INPUT, call_script: { opener: "hi", talking_points: ["a", "b"] } };

      expect(extractToolInput(toolUse(input))).not.toBeNull();
    });

    it("does not require the optional signals field", () => {
      expect(extractToolInput(toolUse(VALID_INPUT))).not.toBeNull();
    });

    it("finds the tool_use block among other blocks", () => {
      const result = message([
        { type: "text", text: "Here are the insights." },
        { type: "tool_use", id: "toolu_test", name: "record_interview_insights", input: VALID_INPUT },
      ]);

      expect(extractToolInput(result)).toEqual(VALID_INPUT);
    });
  });

  describe("missing tool_use block", () => {
    it("returns null when the model replied with text only", () => {
      expect(extractToolInput(message([{ type: "text", text: "I could not analyze this." }]))).toBeNull();
    });

    it("returns null when there is no content at all", () => {
      expect(extractToolInput(message([]))).toBeNull();
    });
  });

  describe("out-of-range or malformed lead_score", () => {
    it.each([
      ["zero", 0],
      ["negative", -3],
      ["above the max", 11],
      ["non-integer", 7.5],
      ["a numeric string", "8"],
      ["null", null],
      ["missing", undefined],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
    ])("returns null for a %s score", (_label, lead_score) => {
      expect(extractToolInput(toolUse({ ...VALID_INPUT, lead_score }))).toBeNull();
    });
  });

  describe("malformed call_script", () => {
    it.each([
      ["missing entirely", undefined],
      ["null", null],
      ["a string instead of an object", "call them"],
      ["missing opener", { talking_points: ["a", "b"] }],
      ["a non-string opener", { opener: 42, talking_points: ["a", "b"] }],
      ["missing talking_points", { opener: "hi" }],
      ["non-array talking_points", { opener: "hi", talking_points: "a, b" }],
      ["null talking_points", { opener: "hi", talking_points: null }],
    ])("returns null when call_script is %s", (_label, call_script) => {
      expect(extractToolInput(toolUse({ ...VALID_INPUT, call_script }))).toBeNull();
    });
  });

  // Documenting the deliberate limit of this validator: it gates only on
  // lead_score and call_script. The remaining fields are normalized by
  // extractInterviewInsights, which falls back per field rather than
  // discarding the whole extraction.
  describe("fields it deliberately does not validate", () => {
    it.each([
      ["pain_points", { pain_points: "not an array" }],
      ["fit_reason", { fit_reason: 42 }],
      ["summary", { summary: null }],
      ["signals", { signals: "not an object" }],
    ])("still returns the input when %s is malformed", (_label, override) => {
      expect(extractToolInput(toolUse({ ...VALID_INPUT, ...override }))).not.toBeNull();
    });
  });
});
