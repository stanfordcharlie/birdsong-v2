import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CHIP_LENGTH, chipsFor, isDontKnowChip, parseChips, stripInterviewMarkers } from "@/lib/interview/chips";

// The parser's two salvage paths log loudly by design; silenced here so a
// passing run stays readable, and asserted on where the log is the point.
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe("parseChips", () => {
  describe("layer 1: a properly closed block", () => {
    it("strips the block and returns the options", () => {
      const { text, chips } = parseChips(
        "How do you handle **after-hours calls** today?\n||CHIPS: mostly by phone | shared spreadsheet | kind of ad hoc||"
      );

      expect(text).toBe("How do you handle **after-hours calls** today?");
      expect(chips).toEqual(["mostly by phone", "shared spreadsheet", "kind of ad hoc"]);
    });

    it("leaves no delimiter residue in the text", () => {
      const { text } = parseChips("Question here?\n||CHIPS: one | two||");

      expect(text).not.toContain("|");
      expect(text).not.toContain("CHIPS");
    });

    it("does not warn, since nothing was salvaged", () => {
      parseChips("Question here?\n||CHIPS: one | two||");

      expect(warn).not.toHaveBeenCalled();
    });

    it("keeps text that follows the block", () => {
      const { text, chips } = parseChips("Before.\n||CHIPS: one | two||\nAfter.");

      expect(text).toBe("Before.\n\nAfter.");
      expect(chips).toEqual(["one", "two"]);
    });
  });

  describe("layer 2: an unclosed opener", () => {
    const unclosed = "What does that routing look like?\n||CHIPS: mostly by phone | shared spreadsheet";

    it("never lets the raw marker survive into the text", () => {
      const { text } = parseChips(unclosed);

      expect(text).toBe("What does that routing look like?");
      expect(text).not.toContain("||");
      expect(text).not.toContain("CHIPS");
    });

    it("still salvages the options", () => {
      expect(parseChips(unclosed).chips).toEqual(["mostly by phone", "shared spreadsheet"]);
    });

    it("warns so the malformed generation is visible in logs", () => {
      parseChips(unclosed);

      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain("unclosed");
    });

    it("handles an opener with no colon", () => {
      const { text, chips } = parseChips("Question?\n||CHIPS one | two");

      expect(text).toBe("Question?");
      expect(chips).toEqual(["one", "two"]);
    });
  });

  describe("layer 3: a truncated marker prefix at the end", () => {
    it.each(["||C", "||CH", "||CHI", "||CHIP"])("strips a message ending in %s", (fragment) => {
      const { text, chips } = parseChips(`Where does that break down?\n${fragment}`);

      expect(text).toBe("Where does that break down?");
      expect(chips).toEqual([]);
    });

    it("only matches at the very end of the string", () => {
      // A "||CH" mid-message is not a truncation, so it passes through.
      const { text, chips } = parseChips("Some ||CH in the middle.");

      expect(text).toBe("Some ||CH in the middle.");
      expect(chips).toEqual([]);
    });
  });

  describe("no block at all", () => {
    it("passes the text through trimmed with no chips", () => {
      const { text, chips } = parseChips("  Just a question, no block.  \n");

      expect(text).toBe("Just a question, no block.");
      expect(chips).toEqual([]);
    });
  });

  describe("option filtering", () => {
    it("caps at three options, keeping the first three", () => {
      const { chips } = parseChips("Q?\n||CHIPS: one | two | three | four | five||");

      expect(chips).toEqual(["one", "two", "three"]);
    });

    it("drops empty options rather than emitting blank chips", () => {
      const { chips } = parseChips("Q?\n||CHIPS: one |  | two||");

      expect(chips).toEqual(["one", "two"]);
    });

    // Documenting current behavior: an over-long option is dropped silently,
    // with no warning and no marker that anything was removed. The rest of
    // the block still parses.
    it(`silently drops an option longer than ${MAX_CHIP_LENGTH} chars`, () => {
      const tooLong = "x".repeat(MAX_CHIP_LENGTH + 1);
      const { chips } = parseChips(`Q?\n||CHIPS: short one | ${tooLong} | short two||`);

      expect(chips).toEqual(["short one", "short two"]);
      expect(warn).not.toHaveBeenCalled();
    });

    it(`keeps an option of exactly ${MAX_CHIP_LENGTH} chars`, () => {
      const atLimit = "x".repeat(MAX_CHIP_LENGTH);
      const { chips } = parseChips(`Q?\n||CHIPS: ${atLimit}||`);

      expect(chips).toEqual([atLimit]);
    });
  });

  // The gap the interview routes have to defend against: both check the raw
  // model output for emptiness before calling this, but the parser can strip
  // a non-empty reply down to nothing. Without a post-parse check that empty
  // string gets persisted and rendered to the respondent as a blank bubble.
  describe("empty text after parsing", () => {
    it("returns empty text when the whole message is a closed block", () => {
      const { text, chips } = parseChips("||CHIPS: one | two||");

      expect(text).toBe("");
      expect(chips).toEqual(["one", "two"]);
    });

    it("returns empty text when an unclosed opener starts the message", () => {
      const { text, chips } = parseChips("||CHIPS: one | two");

      expect(text).toBe("");
      expect(chips).toEqual(["one", "two"]);
    });

    it("returns empty text when the message is only a truncated marker", () => {
      const { text, chips } = parseChips("||CHIP");

      expect(text).toBe("");
      expect(chips).toEqual([]);
    });
  });
});

describe("answer type marker and chip gate", () => {
  it("reads a factual marker, strips it, and keeps the chips", () => {
    const parsed = parseChips(
      "Roughly how many technicians are on the road on a normal day?\n||ANSWER: factual||\n||CHIPS: fewer than 10 | 10 to 30 | more than 30||"
    );
    expect(parsed.text).toBe("Roughly how many technicians are on the road on a normal day?");
    expect(parsed.answerType).toBe("factual");
    expect(chipsFor(parsed)).toEqual(["fewer than 10", "10 to 30", "more than 30"]);
  });

  it("drops chips on a story question even when the model attached some", () => {
    const parsed = parseChips(
      "Walk me through the last time a job was reassigned mid-day.\n||ANSWER: story||\n||CHIPS: dispatcher called | tech texted me | it just happened||"
    );
    expect(parsed.text).toBe("Walk me through the last time a job was reassigned mid-day.");
    expect(parsed.answerType).toBe("story");
    expect(chipsFor(parsed)).toEqual([]);
  });

  it("treats a missing marker as a story question: no chips by default", () => {
    const parsed = parseChips("What tool do you dispatch from?\n||CHIPS: a spreadsheet | ServiceTitan | a whiteboard||");
    expect(parsed.answerType).toBe("story");
    expect(chipsFor(parsed)).toEqual([]);
    expect(parsed.chips).toHaveLength(3);
  });

  it("strips a truncated marker fragment at the end", () => {
    expect(parseChips("What tool do you dispatch from?\n||ANSW").text).toBe("What tool do you dispatch from?");
  });

  it("never offers a way out, however it is phrased", () => {
    const parsed = parseChips(
      "Which channel do most after-hours calls come in on?\n||ANSWER: factual||\n||CHIPS: the office line | honestly not sure offhand | an answering service||"
    );
    expect(chipsFor(parsed)).toEqual(["the office line", "an answering service"]);
    for (const chip of ["not sure", "Don't know", "hard to say", "can't recall", "no idea", "never really thought about it", "I'd rather not say"]) {
      expect(isDontKnowChip(chip)).toBe(true);
    }
    expect(isDontKnowChip("a shared spreadsheet")).toBe(false);
  });

  it("caps at three where chips appear", () => {
    const parsed = parseChips("How many?\n||ANSWER: factual||\n||CHIPS: one | two | three | four||");
    expect(chipsFor(parsed)).toHaveLength(3);
  });
});

describe("the answer marker can never reach a respondent", () => {
  const cases: [string, string, string[]][] = [
    ["marker on the same line as the chips", "Which channel?\n||ANSWER: factual||||CHIPS: phone | email||", ["phone", "email"]],
    ["marker unclosed and run into the chips block", "Which channel? ||ANSWER: factual ||CHIPS: phone | email||", ["phone", "email"]],
    ["marker after the chips block", "Which channel?\n||CHIPS: phone | email||\n||ANSWER: factual||", ["phone", "email"]],
    ["marker twice", "Which channel?\n||ANSWER: factual||\n||ANSWER: factual||\n||CHIPS: phone | email||", ["phone", "email"]],
    ["lowercase and spaced marker", "Which channel?\n|| answer: factual ||\n||CHIPS: phone | email||", ["phone", "email"]],
    ["marker with no type", "Which channel?\n||ANSWER:||", []],
    ["marker alone, unclosed", "Which channel?\n||ANSWER: story", []],
  ];
  for (const [label, raw, chips] of cases) {
    it(label, () => {
      const parsed = parseChips(raw);
      expect(parsed.text).toBe("Which channel?");
      expect(parsed.text).not.toMatch(/answer|chips|\|\|/i);
      expect(chipsFor(parsed)).toEqual(chips);
    });
  }
});

describe("stripInterviewMarkers, the render boundary", () => {
  it("removes any marker or chips block that reached the client, closed or not", () => {
    const cases = [
      "Which channel?\n||ANSWER: factual||\n||CHIPS: phone | email||",
      "Which channel? ||ANSWER: story",
      "Which channel?\n||CHIPS: phone | email",
      "Which channel?\n||CHIPS: phone | email|| ||answer: factual||",
      "Which channel?\n||ANSW",
      "Which channel?\n||CHI",
    ];
    for (const raw of cases) {
      const out = stripInterviewMarkers(raw);
      expect(out).toBe("Which channel?");
      expect(out).not.toMatch(/\|\|ANSWER|\|\|CHIPS|\|\|/i);
    }
  });

  it("leaves ordinary text, bold and a lone pipe alone", () => {
    expect(stripInterviewMarkers("Roughly **how many** techs, 5 | 10 | more?")).toBe("Roughly **how many** techs, 5 | 10 | more?");
  });
});
