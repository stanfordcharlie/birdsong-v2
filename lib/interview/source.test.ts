import { describe, expect, it } from "vitest";
import {
  OUTBOUND_SOURCE,
  SOURCE_MAX_LENGTH,
  isSystemSource,
  reserveSystemSources,
  sanitizeSource,
} from "@/lib/interview/source";

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

describe("reserveSystemSources", () => {
  it("drops the outbound value however it is cased, so ?src= cannot pose as the system row", () => {
    expect(reserveSystemSources("outbound")).toBeNull();
    expect(reserveSystemSources("Outbound")).toBeNull();
    expect(reserveSystemSources(OUTBOUND_SOURCE)).toBeNull();
  });

  it("leaves every other tag alone, including null", () => {
    expect(reserveSystemSources("outbound_q3")).toBe("outbound_q3");
    expect(reserveSystemSources("newsletter")).toBe("newsletter");
    expect(reserveSystemSources(null)).toBeNull();
  });
});

describe("isSystemSource", () => {
  it("recognises the reserved value case-insensitively and nothing else", () => {
    expect(isSystemSource("outbound")).toBe(true);
    expect(isSystemSource(" OUTBOUND ")).toBe(true);
    expect(isSystemSource("direct")).toBe(false);
    expect(isSystemSource(null)).toBe(false);
  });
});
