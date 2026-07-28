import { describe, expect, it } from "vitest";
import { SOURCE_MAX_LENGTH, sanitizeSource } from "@/lib/interview/source";

describe("sanitizeSource", () => {
  it("passes a clean tag through unchanged", () => {
    expect(sanitizeSource("email-blast_q3")).toBe("email-blast_q3");
  });

  it("strips disallowed characters rather than rejecting the value", () => {
    expect(sanitizeSource("email blast!")).toBe("emailblast");
  });

  it("strips characters that would matter if the value were ever interpolated", () => {
    expect(sanitizeSource("<script>alert(1)</script>")).toBe("scriptalert1script");
  });

  it("caps at SOURCE_MAX_LENGTH", () => {
    const result = sanitizeSource("a".repeat(SOURCE_MAX_LENGTH + 20));

    expect(result).toBe("a".repeat(SOURCE_MAX_LENGTH));
  });

  it("strips before capping, so junk does not consume the budget", () => {
    // 60 stripped chars followed by 10 kept ones: the kept ones survive.
    expect(sanitizeSource(`${"!".repeat(60)}${"a".repeat(10)}`)).toBe("a".repeat(10));
  });

  it("returns null for a value that sanitizes down to nothing", () => {
    expect(sanitizeSource("!!!")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(sanitizeSource("")).toBeNull();
  });

  it.each([[undefined], [null], [42], [{ src: "x" }], [["x"]], [true]])(
    "returns null for the non-string input %s",
    (input) => {
      expect(sanitizeSource(input)).toBeNull();
    }
  );
});
