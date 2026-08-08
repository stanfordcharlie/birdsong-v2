import { describe, it, expect } from "vitest";
import { parseCallScript, callScriptToText, isPairedPoint } from "./call-script";

describe("parseCallScript", () => {
  it("reads the paired shape", () => {
    const parsed = parseCallScript({
      opener: "Opening line.",
      talking_points: [{ said: "we re-key everything", angle: "automate the handoff" }],
    });
    expect(parsed).toEqual({
      opener: "Opening line.",
      talkingPoints: [{ said: "we re-key everything", angle: "automate the handoff" }],
    });
  });

  // Rows written before pairing existed. There is no backfill, so these have
  // to keep rendering rather than silently vanishing from the call script.
  it("reads legacy flat strings as points with no quote", () => {
    const parsed = parseCallScript({
      opener: "Opening line.",
      talking_points: ["Connect their re-keying to automated invoicing."],
    });
    expect(parsed!.talkingPoints).toEqual([
      { said: "", angle: "Connect their re-keying to automated invoicing." },
    ]);
    expect(isPairedPoint(parsed!.talkingPoints[0])).toBe(false);
  });

  it("handles a row holding both shapes at once", () => {
    const parsed = parseCallScript({
      opener: "",
      talking_points: ["legacy point", { said: "quote", angle: "new point" }],
    });
    expect(parsed!.talkingPoints).toEqual([
      { said: "", angle: "legacy point" },
      { said: "quote", angle: "new point" },
    ]);
  });

  it("drops points with no angle, since the angle is what the rep says", () => {
    const parsed = parseCallScript({
      opener: "Opening line.",
      talking_points: [{ said: "quote with no angle" }, { said: "q", angle: "  " }, "", null, 42],
    });
    expect(parsed!.talkingPoints).toEqual([]);
  });

  it("keeps a point whose quote is missing but whose angle survives", () => {
    const parsed = parseCallScript({
      opener: "",
      talking_points: [{ angle: "still useful" }],
    });
    expect(parsed!.talkingPoints).toEqual([{ said: "", angle: "still useful" }]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "opener text"],
    ["an empty object", {}],
    ["an opener-less object with no usable points", { talking_points: [{ said: "q" }] }],
  ])("returns null for %s", (_label, input) => {
    expect(parseCallScript(input)).toBeNull();
  });

  it("keeps a script that has an opener but no points", () => {
    expect(parseCallScript({ opener: "Just the opener." })).toEqual({
      opener: "Just the opener.",
      talkingPoints: [],
    });
  });
});

describe("callScriptToText", () => {
  it("labels the quote on paired points and numbers them", () => {
    const text = callScriptToText({
      opener: "Opening line.",
      talkingPoints: [
        { said: "we re-key everything", angle: "automate the handoff" },
        { said: "", angle: "legacy point" },
      ],
    });
    expect(text).toBe(
      [
        "OPENER",
        "Opening line.",
        "",
        "TALKING POINTS",
        '1. They said: "we re-key everything" / automate the handoff',
        "2. legacy point",
      ].join("\n")
    );
  });

  it("omits a section that has nothing in it", () => {
    expect(callScriptToText({ opener: "", talkingPoints: [{ said: "", angle: "only point" }] })).toBe(
      ["TALKING POINTS", "1. only point"].join("\n")
    );
    expect(callScriptToText({ opener: "Only opener.", talkingPoints: [] })).toBe(
      ["OPENER", "Only opener."].join("\n")
    );
  });
});
