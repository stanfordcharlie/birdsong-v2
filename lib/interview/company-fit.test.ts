import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseFit, scoreCompanyFit, type SponsorProfile } from "@/lib/interview/company-fit";

// scoreCompanyFit goes through runAgent, which owns the Anthropic client and
// the agent_runs insert. Mocking both boundaries lets these tests assert the
// short-circuit path makes zero API calls.
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/interview/anthropic", () => ({
  getAnthropicClient: () => ({ messages: { create: mocks.create } }),
  INTERVIEW_MODEL: "claude-sonnet-5",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert: mocks.insert }) }),
}));

const SPONSOR: SponsorProfile = {
  industry: "Field service software",
  whatWeSell: "Dispatch automation",
  targetIcp: "HVAC contractors with 20 to 200 technicians",
  valueProp: "Fewer missed after-hours calls",
};

beforeEach(() => {
  mocks.create.mockReset();
  mocks.insert.mockReset();
  mocks.insert.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("scoreCompanyFit", () => {
  it("short-circuits with a low-confidence 5 when there is no name or domain", async () => {
    const fit = await scoreCompanyFit({ name: null, domain: null }, SPONSOR);

    expect(fit.fitScore).toBe(5);
    expect(fit.fitConfidence).toBe("low");
    expect(fit.fitReasoning).toContain("No company name or work-email domain");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("short-circuits when the name and domain are only whitespace", async () => {
    const fit = await scoreCompanyFit({ name: "  ", domain: "  " }, SPONSOR);

    expect(fit.fitScore).toBe(5);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("marks the fit unavailable when the agent run fails", async () => {
    mocks.create.mockRejectedValue(new Error("overloaded_error"));

    const fit = await scoreCompanyFit({ name: "Acme HVAC", domain: "acmehvac.com" }, SPONSOR);

    expect(fit).toEqual({ fitScore: null, fitReasoning: "", fitConfidence: "unavailable" });
  });
});

describe("parseFit", () => {
  const VALID = { fit_score: 8, fit_reasoning: "  Regional HVAC contractor, ~60 techs.  ", fit_confidence: "high" };

  it("accepts a well-formed assessment and trims the reasoning", () => {
    expect(parseFit(VALID)).toEqual({
      fitScore: 8,
      fitReasoning: "Regional HVAC contractor, ~60 techs.",
      fitConfidence: "high",
    });
  });

  it("accepts the boundary scores 1 and 10", () => {
    expect(parseFit({ ...VALID, fit_score: 1 })).not.toBeNull();
    expect(parseFit({ ...VALID, fit_score: 10 })).not.toBeNull();
  });

  it("rejects scores outside 1 to 10 and non-integer scores", () => {
    expect(parseFit({ ...VALID, fit_score: 0 })).toBeNull();
    expect(parseFit({ ...VALID, fit_score: 11 })).toBeNull();
    expect(parseFit({ ...VALID, fit_score: 7.5 })).toBeNull();
    expect(parseFit({ ...VALID, fit_score: "8" })).toBeNull();
  });

  it("rejects a confidence outside the enum", () => {
    expect(parseFit({ ...VALID, fit_confidence: "unavailable" })).toBeNull();
    expect(parseFit({ ...VALID, fit_confidence: undefined })).toBeNull();
  });

  it("defaults missing reasoning to an empty string rather than failing", () => {
    expect(parseFit({ fit_score: 5, fit_confidence: "low" })).toEqual({
      fitScore: 5,
      fitReasoning: "",
      fitConfidence: "low",
    });
  });

  it("rejects input that is not an object", () => {
    expect(parseFit(null)).toBeNull();
    expect(parseFit(undefined)).toBeNull();
    expect(parseFit("nope")).toBeNull();
  });
});
