import { describe, expect, it } from "vitest";
import { generateSessionToken, sessionTokenIsValid, tokensMatch } from "@/lib/interview/token";

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

// The predicate /api/interview/continue applies inline before it will act on
// a responses row, and now the one /api/interview/resume calls. These cases
// pin it to what that inline check accepts and rejects: a string token, a
// stored token on the row, and a constant-time match between them.
describe("sessionTokenIsValid", () => {
  it("accepts a supplied token that matches the stored one", () => {
    const token = generateSessionToken();

    expect(sessionTokenIsValid(token, token)).toBe(true);
  });

  it("rejects a token that does not match the stored one", () => {
    expect(sessionTokenIsValid(generateSessionToken(), generateSessionToken())).toBe(false);
    expect(sessionTokenIsValid(`${"a".repeat(63)}b`, "a".repeat(64))).toBe(false);
  });

  it("rejects a row with no stored token, whatever the caller supplies", () => {
    expect(sessionTokenIsValid(generateSessionToken(), null)).toBe(false);
    expect(sessionTokenIsValid(generateSessionToken(), undefined)).toBe(false);
    expect(sessionTokenIsValid(generateSessionToken(), "")).toBe(false);
  });

  it("rejects a missing or non-string token without throwing", () => {
    const stored = generateSessionToken();

    for (const provided of [undefined, null, "", 0, 12345, true, {}, [], ["x"]]) {
      expect(() => sessionTokenIsValid(provided, stored)).not.toThrow();
      expect(sessionTokenIsValid(provided, stored)).toBe(false);
    }
  });

  // Two empty strings match under tokensMatch, but an empty stored token
  // means the row was never issued one, so this must still be a rejection.
  it("rejects two empty strings, unlike the raw byte comparison", () => {
    expect(tokensMatch("", "")).toBe(true);
    expect(sessionTokenIsValid("", "")).toBe(false);
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
