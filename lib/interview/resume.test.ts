import { describe, expect, it } from "vitest";
import {
  lastAssistantContent,
  lastAssistantIndex,
  toPublicTranscript,
  withLastAssistantContent,
} from "@/lib/interview/resume";

describe("toPublicTranscript", () => {
  it("keeps role and content in order", () => {
    const raw = [
      { role: "assistant", content: "How does dispatch work today?" },
      { role: "user", content: "Two people on radios." },
      { role: "assistant", content: "What breaks first when it gets busy?" },
    ];

    expect(toPublicTranscript(raw)).toEqual(raw);
  });

  it("drops every field except role and content", () => {
    const raw = [
      {
        role: "assistant",
        content: "How does dispatch work today?",
        lead_score: 9,
        pain_points: ["missed after-hours calls"],
        session_token: "a".repeat(64),
        internalNote: "flagged for follow up",
      },
    ];

    const [message] = toPublicTranscript(raw);

    expect(message).toEqual({ role: "assistant", content: "How does dispatch work today?" });
    expect(Object.keys(message)).toEqual(["role", "content"]);
  });

  it("drops entries with a role the interview UI does not render", () => {
    const raw = [
      { role: "system", content: "internal instruction" },
      { role: "assistant", content: "A real question." },
      { role: "tool", content: "internal tool output" },
    ];

    expect(toPublicTranscript(raw)).toEqual([{ role: "assistant", content: "A real question." }]);
  });

  it("drops entries whose content is missing, empty, or not a string", () => {
    const raw = [
      { role: "assistant" },
      { role: "assistant", content: "" },
      { role: "user", content: 42 },
      { role: "user", content: { text: "nested" } },
      { role: "assistant", content: "Kept." },
    ];

    expect(toPublicTranscript(raw)).toEqual([{ role: "assistant", content: "Kept." }]);
  });

  it("returns an empty array for anything that is not an array of objects", () => {
    expect(toPublicTranscript(null)).toEqual([]);
    expect(toPublicTranscript(undefined)).toEqual([]);
    expect(toPublicTranscript("[]")).toEqual([]);
    expect(toPublicTranscript({ messages: [] })).toEqual([]);
    expect(toPublicTranscript([null, "text", 7])).toEqual([]);
  });
});

describe("lastAssistantContent", () => {
  it("returns the most recent interviewer turn", () => {
    const messages = [
      { role: "assistant" as const, content: "First question" },
      { role: "user" as const, content: "An answer" },
      { role: "assistant" as const, content: "Second question" },
      { role: "user" as const, content: "Another answer" },
      { role: "assistant" as const, content: "Third question" },
    ];

    expect(lastAssistantContent(messages)).toBe("Third question");
  });

  it("skips trailing respondent turns", () => {
    const messages = [
      { role: "assistant" as const, content: "The question" },
      { role: "user" as const, content: "The answer" },
    ];

    expect(lastAssistantContent(messages)).toBe("The question");
  });

  it("returns an empty string when there is no interviewer turn", () => {
    expect(lastAssistantContent([])).toBe("");
    expect(lastAssistantContent([{ role: "user", content: "Only me" }])).toBe("");
  });
});

describe("lastAssistantIndex", () => {
  it("finds the position of the most recent interviewer turn", () => {
    const messages = [
      { role: "assistant" as const, content: "First" },
      { role: "user" as const, content: "Answer" },
      { role: "assistant" as const, content: "Second" },
      { role: "user" as const, content: "Answer" },
    ];

    expect(lastAssistantIndex(messages)).toBe(2);
  });

  it("returns -1 when there is no interviewer turn", () => {
    expect(lastAssistantIndex([])).toBe(-1);
    expect(lastAssistantIndex([{ role: "user", content: "Only me" }])).toBe(-1);
  });
});

describe("withLastAssistantContent", () => {
  it("rewrites only the interviewer's last turn", () => {
    const messages = [
      { role: "assistant" as const, content: "First question" },
      { role: "user" as const, content: "An answer" },
      { role: "assistant" as const, content: "Second question||CHIPS: a | b||" },
    ];

    expect(withLastAssistantContent(messages, "Second question")).toEqual([
      { role: "assistant", content: "First question" },
      { role: "user", content: "An answer" },
      { role: "assistant", content: "Second question" },
    ]);
  });

  it("leaves a trailing respondent turn in place", () => {
    const messages = [
      { role: "assistant" as const, content: "The question" },
      { role: "user" as const, content: "The answer" },
    ];

    expect(withLastAssistantContent(messages, "Rewritten")).toEqual([
      { role: "assistant", content: "Rewritten" },
      { role: "user", content: "The answer" },
    ]);
  });

  it("returns the transcript unchanged when there is no interviewer turn", () => {
    const messages = [{ role: "user" as const, content: "Only me" }];

    expect(withLastAssistantContent(messages, "ignored")).toEqual(messages);
  });
});
