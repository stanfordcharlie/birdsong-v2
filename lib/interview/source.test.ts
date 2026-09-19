import { describe, expect, it } from "vitest";
import { OUTBOUND_SOURCE, isSystemSource, reserveSystemSources, sanitizeSource } from "./source";

describe("sanitizeSource", () => {
  it("keeps a plain tag and strips anything outside [A-Za-z0-9_-]", () => {
    expect(sanitizeSource("linkedin_post")).toBe("linkedin_post");
    expect(sanitizeSource("q3 ads!")).toBe("q3ads");
  });

  it("is null for a non-string or an empty result", () => {
    expect(sanitizeSource(undefined)).toBeNull();
    expect(sanitizeSource(42)).toBeNull();
    expect(sanitizeSource("!!!")).toBeNull();
  });
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
