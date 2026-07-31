import { describe, expect, it } from "vitest";
import {
  activeSessionStorageKey,
  parseActiveSession,
  serializeActiveSession,
} from "@/lib/interview/active-session";

const SURVEY_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_SURVEY_ID = "22222222-2222-2222-2222-222222222222";
const SESSION = {
  responseId: "33333333-3333-3333-3333-333333333333",
  token: "a".repeat(64),
  surveyId: SURVEY_ID,
};

describe("activeSessionStorageKey", () => {
  it("namespaces the key by survey so two surveys never share a pointer", () => {
    expect(activeSessionStorageKey(SURVEY_ID)).toBe(`birdsong-interview-active:${SURVEY_ID}`);
    expect(activeSessionStorageKey(SURVEY_ID)).not.toBe(activeSessionStorageKey(OTHER_SURVEY_ID));
  });

  // The completion record uses birdsong-survey-complete:{id}; a collision
  // would make one feature clobber the other.
  it("does not collide with the completion record key", () => {
    expect(activeSessionStorageKey(SURVEY_ID)).not.toBe(`birdsong-survey-complete:${SURVEY_ID}`);
  });
});

describe("parseActiveSession", () => {
  it("round-trips a serialized pointer", () => {
    expect(parseActiveSession(serializeActiveSession(SESSION), SURVEY_ID)).toEqual(SESSION);
  });

  it("returns null when nothing is stored", () => {
    expect(parseActiveSession(null, SURVEY_ID)).toBeNull();
    expect(parseActiveSession("", SURVEY_ID)).toBeNull();
  });

  it("returns null for stored text that is not JSON", () => {
    expect(parseActiveSession("not json", SURVEY_ID)).toBeNull();
    expect(parseActiveSession("{oops", SURVEY_ID)).toBeNull();
  });

  it("returns null for JSON that is not an object", () => {
    expect(parseActiveSession('"a string"', SURVEY_ID)).toBeNull();
    expect(parseActiveSession("42", SURVEY_ID)).toBeNull();
    expect(parseActiveSession("null", SURVEY_ID)).toBeNull();
    expect(parseActiveSession("[]", SURVEY_ID)).toBeNull();
  });

  it("returns null when a field is missing, empty, or the wrong type", () => {
    const cases = [
      { ...SESSION, responseId: undefined },
      { ...SESSION, responseId: "" },
      { ...SESSION, responseId: 7 },
      { ...SESSION, token: undefined },
      { ...SESSION, token: "" },
      { ...SESSION, token: { value: "a" } },
      { ...SESSION, surveyId: undefined },
    ];

    for (const broken of cases) {
      expect(parseActiveSession(JSON.stringify(broken), SURVEY_ID)).toBeNull();
    }
  });

  // A pointer left by a different survey must never be used to resume this
  // one: the token belongs to another interview and would just be rejected.
  it("returns null when the stored pointer belongs to another survey", () => {
    const stored = serializeActiveSession({ ...SESSION, surveyId: OTHER_SURVEY_ID });

    expect(parseActiveSession(stored, SURVEY_ID)).toBeNull();
  });
});
