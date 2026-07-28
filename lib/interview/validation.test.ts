import { describe, expect, it } from "vitest";
import {
  CUSTOM_FIELD_MAX_LENGTH,
  isValidEmail,
  sanitizeCustomFieldValues,
  truncate,
} from "@/lib/interview/validation";

describe("isValidEmail", () => {
  it.each(["dana@acme.com", "dana.smith@acme-corp.co.uk", "dana+tag@acme.com", "d@a.io"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    }
  );

  it.each([
    ["", "empty"],
    ["dana", "no @ or domain"],
    ["dana@acme", "no dot in the domain"],
    ["dana@.com", "no domain label"],
    ["@acme.com", "no local part"],
    ["dana @acme.com", "whitespace in the local part"],
    ["dana@acme .com", "whitespace in the domain"],
    ["dana@@acme.com", "doubled @"],
  ])("rejects %s (%s)", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  // Deliberately permissive: this is a malformed-input guard, not an RFC 5322
  // validator, so some technically-invalid addresses pass.
  it("accepts an address a stricter validator would reject", () => {
    expect(isValidEmail("dana..smith@acme.com")).toBe(true);
  });
});

describe("truncate", () => {
  it("leaves a value shorter than the cap alone", () => {
    expect(truncate("short", 100)).toBe("short");
  });

  it("leaves a value exactly at the cap alone", () => {
    expect(truncate("abcde", 5)).toBe("abcde");
  });

  it("cuts a value over the cap", () => {
    expect(truncate("abcdefgh", 5)).toBe("abcde");
  });

  it("returns an empty string for a cap of zero", () => {
    expect(truncate("abc", 0)).toBe("");
  });

  it("does not trim, it only cuts", () => {
    expect(truncate("  padded  ", 100)).toBe("  padded  ");
  });
});

describe("sanitizeCustomFieldValues", () => {
  it("returns an empty object for undefined", () => {
    expect(sanitizeCustomFieldValues(undefined)).toEqual({});
  });

  it("trims string values", () => {
    expect(sanitizeCustomFieldValues({ job_title: "  Ops Manager  " })).toEqual({
      job_title: "Ops Manager",
    });
  });

  it("caps string values at CUSTOM_FIELD_MAX_LENGTH", () => {
    const result = sanitizeCustomFieldValues({ notes: "x".repeat(CUSTOM_FIELD_MAX_LENGTH + 50) });

    expect(result.notes).toBe("x".repeat(CUSTOM_FIELD_MAX_LENGTH));
  });

  it("trims before capping", () => {
    const result = sanitizeCustomFieldValues({
      notes: `   ${"x".repeat(CUSTOM_FIELD_MAX_LENGTH)}   `,
    });

    expect(result.notes).toBe("x".repeat(CUSTOM_FIELD_MAX_LENGTH));
  });

  it("passes non-string values through untouched", () => {
    const nested = { deep: true };
    const result = sanitizeCustomFieldValues({
      count: 3,
      flag: false,
      missing: null,
      nested,
      list: [1, 2],
    });

    expect(result).toEqual({ count: 3, flag: false, missing: null, nested, list: [1, 2] });
    expect(result.nested).toBe(nested);
  });

  it("preserves keys, including ones that sanitize to an empty string", () => {
    expect(sanitizeCustomFieldValues({ job_title: "   " })).toEqual({ job_title: "" });
  });

  it("does not mutate the input object", () => {
    const input = { job_title: "  Ops Manager  " };
    sanitizeCustomFieldValues(input);

    expect(input.job_title).toBe("  Ops Manager  ");
  });
});
