import { describe, expect, it } from "vitest";
import { canonicalOrigin, prospectLinkFor } from "./link";

describe("canonicalOrigin", () => {
  it("moves the bare apex onto www, the host that answers without a redirect", () => {
    expect(canonicalOrigin("https://usebirdsong.com")).toBe("https://www.usebirdsong.com");
    expect(canonicalOrigin("https://usebirdsong.com/")).toBe("https://www.usebirdsong.com");
  });

  it("leaves www, localhost and preview hosts alone, minus a trailing slash", () => {
    expect(canonicalOrigin("https://www.usebirdsong.com/")).toBe("https://www.usebirdsong.com");
    expect(canonicalOrigin("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(canonicalOrigin("https://birdsong-v2-abc.vercel.app")).toBe(
      "https://birdsong-v2-abc.vercel.app"
    );
  });
});

describe("prospectLinkFor", () => {
  it("emits the /study/[slug]/[token] shape on the canonical host", () => {
    expect(prospectLinkFor("https://usebirdsong.com/", "demand-gen", "YbXEWslGYxFW")).toBe(
      "https://www.usebirdsong.com/study/demand-gen/YbXEWslGYxFW"
    );
  });
});
