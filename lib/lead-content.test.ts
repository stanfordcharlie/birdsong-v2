import { describe, expect, it } from "vitest";
import {
  formatPainPointList,
  selectCallScriptOpener,
  selectRespondentCompanyName,
  selectTopPainPoint,
} from "@/lib/lead-content";

describe("selectTopPainPoint", () => {
  it("takes the first pain point", () => {
    expect(selectTopPainPoint(["Manual reconciliation", "Dispatch delays"])).toBe(
      "Manual reconciliation"
    );
  });

  it("returns null for an empty list", () => {
    expect(selectTopPainPoint([])).toBeNull();
  });

  // The Slack notification's only behavioural change from sharing this
  // selection: a blank first pain point used to render an empty blockquote.
  it("returns null rather than a blank pain point", () => {
    expect(selectTopPainPoint(["   "])).toBeNull();
  });
});

describe("selectCallScriptOpener", () => {
  it("returns the trimmed opener", () => {
    expect(selectCallScriptOpener({ opener: "  You mentioned spreadsheets.  " })).toBe(
      "You mentioned spreadsheets."
    );
  });

  it("returns null when there is no script or no opener", () => {
    expect(selectCallScriptOpener(null)).toBeNull();
    expect(selectCallScriptOpener({ opener: "" })).toBeNull();
    expect(selectCallScriptOpener({ opener: "  " })).toBeNull();
  });
});

describe("formatPainPointList", () => {
  it("renders one bullet per line", () => {
    expect(formatPainPointList(["Manual reconciliation", "Dispatch delays"])).toBe(
      "- Manual reconciliation\n- Dispatch delays"
    );
  });

  it("drops blanks instead of leaving a dangling bullet", () => {
    expect(formatPainPointList(["Manual reconciliation", "  "])).toBe("- Manual reconciliation");
  });

  it("returns null when nothing survives", () => {
    expect(formatPainPointList([])).toBeNull();
    expect(formatPainPointList(["  "])).toBeNull();
  });
});

describe("selectRespondentCompanyName", () => {
  it("prefers the collected company over the derived one", () => {
    expect(
      selectRespondentCompanyName({ company: "Acme Corp", derived_company_name: "acme.com" })
    ).toBe("Acme Corp");
  });

  it("falls back to the name derived from the email domain", () => {
    expect(selectRespondentCompanyName({ derived_company_name: "Acme" })).toBe("Acme");
  });

  it("returns null when neither is present or usable", () => {
    expect(selectRespondentCompanyName(null)).toBeNull();
    expect(selectRespondentCompanyName({})).toBeNull();
    expect(selectRespondentCompanyName({ company: "   " })).toBeNull();
    expect(selectRespondentCompanyName({ company: 42 })).toBeNull();
  });
});
