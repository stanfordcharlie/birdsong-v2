import { describe, expect, it } from "vitest";
import { randomSlugSuffix, slugify } from "@/lib/surveys/slugify";

// Not exported from the module; mirrored here only to build inputs that
// straddle the boundary. The assertions below check the observable behavior
// (length, no trailing hyphen, cut on a word boundary), not this number.
const MAX_SLUG_LENGTH = 60;

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Field Ops Research")).toBe("field-ops-research");
  });

  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    expect(slugify("Field   Ops -- Research!!! 2026")).toBe("field-ops-research-2026");
  });

  it("strips leading and trailing separators", () => {
    expect(slugify("  ...Field Ops...  ")).toBe("field-ops");
  });

  it("drops non-ASCII characters", () => {
    expect(slugify("Café Ops")).toBe("caf-ops");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!! ???")).toBe("");
  });

  it("keeps a slug at exactly the max length intact", () => {
    const input = "a".repeat(MAX_SLUG_LENGTH);

    expect(slugify(input)).toBe(input);
  });

  describe("truncation of long input", () => {
    it("cuts back to the last hyphen rather than mid-word", () => {
      expect(
        slugify("Field Operations Research About After Hours Dispatch And Routing Workflows")
      ).toBe("field-operations-research-about-after-hours-dispatch-and");
    });

    it("never exceeds the max length and never ends on a partial word", () => {
      const input = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee ffffffffff gggg";
      const base = "aaaaaaaaaa-bbbbbbbbbb-cccccccccc-dddddddddd-eeeeeeeeee-ffffffffff-gggg";
      const result = slugify(input);

      expect(base.length).toBeGreaterThan(MAX_SLUG_LENGTH);
      expect(result).toBe("aaaaaaaaaa-bbbbbbbbbb-cccccccccc-dddddddddd-eeeeeeeeee");
      expect(result.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
      // The character right after the cut is the separator, i.e. a whole
      // word was dropped rather than sliced through.
      expect(base[result.length]).toBe("-");
    });

    it("never leaves a trailing hyphen when the cut lands on one", () => {
      // The separator lands on the last kept character, so the naive slice
      // would end in a hyphen.
      const input = `${"a".repeat(MAX_SLUG_LENGTH - 1)} tail`;
      const result = slugify(input);

      expect(result).toBe("a".repeat(MAX_SLUG_LENGTH - 1));
      expect(result.endsWith("-")).toBe(false);
    });

    it("hard-cuts a single long word that has no hyphen to cut back to", () => {
      const result = slugify("x".repeat(80));

      expect(result).toBe("x".repeat(MAX_SLUG_LENGTH));
      expect(result.length).toBe(MAX_SLUG_LENGTH);
    });
  });
});

describe("randomSlugSuffix", () => {
  it("returns 6 lowercase alphanumeric characters", () => {
    expect(randomSlugSuffix()).toMatch(/^[a-z0-9]{6}$/);
  });

  it("varies across calls", () => {
    const suffixes = new Set(Array.from({ length: 50 }, () => randomSlugSuffix()));

    expect(suffixes.size).toBeGreaterThan(45);
  });
});
