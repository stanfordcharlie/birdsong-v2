import { describe, expect, it } from "vitest";
import { generateSessionToken, tokensMatch } from "@/lib/interview/token";

describe("tokensMatch", () => {
  it("matches an identical token", () => {
    const token = generateSessionToken();

    expect(tokensMatch(token, token)).toBe(true);
  });

  it("rejects a same-length token that differs in one character", () => {
    const stored = "a".repeat(64);
    const provided = `${"a".repeat(63)}b`;

    expect(tokensMatch(provided, stored)).toBe(false);
  });

  it("rejects a same-length token that differs in the first character", () => {
    expect(tokensMatch(`b${"a".repeat(63)}`, "a".repeat(64))).toBe(false);
  });

  // The length-mismatch branch runs a same-length comparison against the
  // stored token before returning, so it must not throw the way a raw
  // timingSafeEqual on mismatched buffers would.
  describe("length mismatch", () => {
    it.each([
      ["shorter", "abc", "abcdef"],
      ["longer", "abcdef", "abc"],
      ["empty provided", "", "abcdef"],
      ["empty stored", "abcdef", ""],
      ["both empty but unequal length is impossible, so a prefix", "abcde", "abcdef"],
    ])("returns false without throwing (%s)", (_label, provided, stored) => {
      expect(() => tokensMatch(provided, stored)).not.toThrow();
      expect(tokensMatch(provided, stored)).toBe(false);
    });
  });

  it("compares bytes, so two equal empty strings match", () => {
    expect(tokensMatch("", "")).toBe(true);
  });
});

describe("generateSessionToken", () => {
  it("returns 64 hex characters (32 random bytes)", () => {
    expect(generateSessionToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not repeat across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSessionToken()));

    expect(tokens.size).toBe(50);
  });
});
