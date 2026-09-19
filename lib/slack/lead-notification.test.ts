import { describe, expect, it } from "vitest";
import { buildLeadNotificationMessage, type LeadNotificationFields } from "./lead-notification";

const BASE: LeadNotificationFields = {
  surveyTitle: "Ops research",
  respondentName: "Jordan Lee",
  respondentEmail: "jordan.lee@acme.com",
  respondentPhone: null,
  jobTitle: null,
  company: "Acme Corp",
  leadScore: 9,
  fitScore: null,
  topPainPoint: "Manual reconciliation every week.",
  callScriptOpener: null,
  completedAt: new Date().toISOString(),
  responseUrl: "https://www.usebirdsong.com/admin/responses/r1",
};

const contactSection = (message: ReturnType<typeof buildLeadNotificationMessage>) =>
  (message?.blocks.find((b) => b.type === "section" && Array.isArray((b as { fields?: unknown }).fields)) as { fields: { text: string }[] } | undefined)?.fields.map((f) => f.text) ?? [];

describe("lead notification with a prospect", () => {
  it("adds title, company and a clickable LinkedIn link to the contact section", () => {
    const message = buildLeadNotificationMessage({
      ...BASE,
      prospect: { title: "Director of Demand Gen", companyName: "TRM Labs", companyDomain: "trmlabs.com", linkedinUrl: "https://www.linkedin.com/in/example" },
    });
    expect(contactSection(message)).toEqual([
      "*Email*\n<mailto:jordan.lee@acme.com|jordan.lee@acme.com>",
      "*Title*\nDirector of Demand Gen",
      "*Company*\nTRM Labs",
      "*LinkedIn*\n<https://www.linkedin.com/in/example|View profile>",
    ]);
  });

  it("omits any prospect line whose value is missing", () => {
    const message = buildLeadNotificationMessage({
      ...BASE,
      prospect: { title: null, companyName: "TRM Labs", companyDomain: null, linkedinUrl: null },
    });
    expect(contactSection(message)).toEqual(["*Email*\n<mailto:jordan.lee@acme.com|jordan.lee@acme.com>", "*Company*\nTRM Labs"]);
  });

  it("is byte-identical to the pre-prospect message when there is no prospect", () => {
    const withoutField = buildLeadNotificationMessage(BASE);
    const withNull = buildLeadNotificationMessage({ ...BASE, prospect: null });
    expect(withNull).toEqual(withoutField);
    expect(JSON.stringify(withoutField)).not.toMatch(/Title|LinkedIn/);
  });
});
