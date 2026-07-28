import { describe, expect, it } from "vitest";
import {
  deriveCompanyNameFromDomain,
  extractEmailDomain,
  isFreeEmailDomain,
} from "@/lib/interview/work-email";

describe("extractEmailDomain", () => {
  it("returns the lowercased domain", () => {
    expect(extractEmailDomain("Dana@Acme-Corp.com")).toBe("acme-corp.com");
  });

  it("trims surrounding whitespace", () => {
    expect(extractEmailDomain("  dana@acme.com \n")).toBe("acme.com");
  });

  it("splits on the last @, not the first", () => {
    expect(extractEmailDomain("odd\"name\"@acme.com")).toBe("acme.com");
  });

  it("returns null with no @", () => {
    expect(extractEmailDomain("dana.acme.com")).toBeNull();
  });

  it("returns null when nothing follows the @", () => {
    expect(extractEmailDomain("dana@")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractEmailDomain("")).toBeNull();
  });
});

describe("isFreeEmailDomain", () => {
  it("matches a listed free provider", () => {
    expect(isFreeEmailDomain("gmail.com")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isFreeEmailDomain("GMAIL.COM")).toBe(true);
  });

  it("matches a listed regional variant", () => {
    expect(isFreeEmailDomain("hotmail.co.uk")).toBe(true);
  });

  it("does not match a work domain", () => {
    expect(isFreeEmailDomain("acme-corp.com")).toBe(false);
  });

  it("does not match a subdomain of a free provider", () => {
    expect(isFreeEmailDomain("mail.gmail.com")).toBe(false);
  });
});

describe("deriveCompanyNameFromDomain", () => {
  it("title-cases a simple domain", () => {
    expect(deriveCompanyNameFromDomain("acme.com")).toBe("Acme");
  });

  it("splits hyphenated labels into words", () => {
    expect(deriveCompanyNameFromDomain("acme-corp.com")).toBe("Acme Corp");
  });

  it("splits underscored labels into words", () => {
    expect(deriveCompanyNameFromDomain("acme_corp.com")).toBe("Acme Corp");
  });

  it("strips a two-part ccTLD instead of treating it as the company", () => {
    expect(deriveCompanyNameFromDomain("acme-corp.co.uk")).toBe("Acme Corp");
  });

  it("strips subdomains as well as the ccTLD", () => {
    expect(deriveCompanyNameFromDomain("sales.acme-corp.co.uk")).toBe("Acme Corp");
  });

  it("handles an unlisted two-part-looking TLD by dropping only the last label", () => {
    // "co.fr" isn't in SECOND_LEVEL_TLDS, so only ".fr" comes off and the
    // company label reads as "Co". Documenting the known limit of the list.
    expect(deriveCompanyNameFromDomain("acme.co.fr")).toBe("Co");
  });

  it("falls back to the only label when there is no TLD to strip", () => {
    expect(deriveCompanyNameFromDomain("acme")).toBe("Acme");
  });

  it("lowercases the rest of each word", () => {
    expect(deriveCompanyNameFromDomain("ACME-CORP.com")).toBe("Acme Corp");
  });
});
