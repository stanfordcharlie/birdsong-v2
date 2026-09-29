import { describe, expect, it } from "vitest";
import { DEFAULT_STUDY_TAB, STUDY_TABS, isStudyTab, studyTabFromParam } from "./tabs";

describe("study tabs", () => {
  it("accepts each in-place section", () => {
    for (const tab of STUDY_TABS) {
      expect(isStudyTab(tab)).toBe(true);
      expect(studyTabFromParam(tab)).toBe(tab);
    }
  });

  it("falls back to the default for anything else", () => {
    // Prospects is its own route, never a value here.
    for (const value of ["prospects", "", "Responses", undefined, null, 3, ["report"]]) {
      expect(isStudyTab(value)).toBe(false);
      expect(studyTabFromParam(value)).toBe(DEFAULT_STUDY_TAB);
    }
  });
});
