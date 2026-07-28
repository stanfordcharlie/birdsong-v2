import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CHIP_LENGTH, parseChips } from "@/lib/interview/chips";

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
