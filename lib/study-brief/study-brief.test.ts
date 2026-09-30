import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { MessagesClient } from "@/lib/interview/anthropic";
import type { StructuredGuide } from "@/lib/studies/guide";
import { countGuideTopics } from "@/lib/studies/interview-length";
import { runConverseTurn } from "./converse";
import {
  DEFAULT_RESPONDENT_FIELDS,
  OFF_LIMITS_HEADING,
  mapToStudy,
  toExtractedBrief,
} from "./mapToStudy";
import { CONVERSE_TOOL, CONVERSE_TOOL_NAME, parseConverseReply, sanitizePatch, titleImpliesSales } from "./schema";
import {
  BRIEF_FIELD_KEYS,
  EMPTY_BRIEF,
  isConversationComplete,
  isReadyToCreate,
  sanitizeBrief,
  type BriefFieldKey,
  type StudyBrief,
} from "./types";

const NONE = new Set<BriefFieldKey>();

const VALID = {
  reply: "Who do you want to hear from?",
  chips: [],
  brief_patch: { researchQuestion: "How handoffs to sales work today" },
  complete: false,
};

describe("parseConverseReply", () => {
  it("reads a plain JSON object", () => {
    const result = parseConverseReply(JSON.stringify(VALID));
    expect(result).toEqual({
      ok: true,
      value: {
        reply: VALID.reply,
        chips: [],
        briefPatch: VALID.brief_patch,
        complete: false,
      },
    });
  });

  it("reads JSON wrapped in a code fence", () => {
    const fenced = "```json\n" + JSON.stringify(VALID, null, 2) + "\n```";
    const result = parseConverseReply(fenced);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.briefPatch).toEqual(VALID.brief_patch);
  });

  it("reads JSON with a sentence in front of it", () => {
    const result = parseConverseReply(`Here is the reply:\n${JSON.stringify(VALID)}`);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON without throwing", () => {
    expect(parseConverseReply('{"reply": "unterminated')).toMatchObject({ ok: false });
    expect(parseConverseReply("{not json}")).toMatchObject({ ok: false });
    expect(parseConverseReply("I could not do that.")).toMatchObject({ ok: false });
    expect(parseConverseReply("")).toMatchObject({ ok: false });
  });

  it("rejects an object with no reply, or a patch that is not an object", () => {
    expect(parseConverseReply(JSON.stringify({ ...VALID, reply: "  " }))).toMatchObject({ ok: false });
    expect(parseConverseReply(JSON.stringify({ ...VALID, brief_patch: ["x"] }))).toMatchObject({ ok: false });
  });

  it("treats a missing patch, chips or complete as empty", () => {
    const result = parseConverseReply(JSON.stringify({ reply: "One line." }));
    expect(result).toEqual({
      ok: true,
      value: { reply: "One line.", chips: [], briefPatch: {}, complete: false },
    });
  });

  it("cleans the copy it shows: no em dashes, never a survey", () => {
    const result = parseConverseReply(
      JSON.stringify({ ...VALID, reply: "This survey is short — about ten minutes.", chips: ["Short survey", 7, ""] })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reply).toBe("This study is short, about ten minutes.");
      expect(result.value.chips).toEqual(["Short study"]);
    }
  });
});

describe("sanitizePatch", () => {
  it("drops a key the admin edited by hand, and keeps the rest", () => {
    const { patch, dropped } = sanitizePatch(
      { externalTitle: "How teams plan the quarter", topic: "Quarterly planning" },
      new Set<BriefFieldKey>(["externalTitle"])
    );
    expect(patch).toEqual({ topic: "Quarterly planning" });
    expect(dropped.manual).toEqual(["externalTitle"]);
  });

  it("drops a key that is not a brief field", () => {
    const { patch, dropped } = sanitizePatch(
      { topic: "Quarterly planning", status: "live", org_id: "someone-else", __proto__x: 1 },
      NONE
    );
    expect(patch).toEqual({ topic: "Quarterly planning" });
    expect(dropped.unknown).toEqual(["status", "org_id", "__proto__x"]);
  });

  it("drops a value its field would not take", () => {
    const { patch, dropped } = sanitizePatch(
      { length: "forever", giftAmount: -5, signals: 12, topic: 12 },
      NONE
    );
    expect(patch).toEqual({});
    expect(dropped.invalid).toEqual(["length", "giftAmount", "signals", "topic"]);
  });

  it("takes the signals the model sends, list or not", () => {
    // The card reads an array. A single string is one signal, and lines or
    // semicolons are several; either way the answer is not thrown away.
    expect(sanitizePatch({ signals: "Switching within two quarters" }, NONE).patch).toEqual({
      signals: ["Switching within two quarters"],
    });
    expect(sanitizePatch({ signals: "- Switching soon\n- Handoff is manual" }, NONE).patch).toEqual({
      signals: ["Switching soon", "Handoff is manual"],
    });
    expect(sanitizePatch({ signals: "Switching soon; handoff is manual" }, NONE).patch).toEqual({
      signals: ["Switching soon", "handoff is manual"],
    });
  });

  it("keeps valid choices and trims what it keeps", () => {
    const { patch } = sanitizePatch(
      { length: "deep", giftAmount: 15, giftBrand: "  Amazon ", signals: [" Manual handoff ", "", 3] },
      NONE
    );
    expect(patch).toEqual({ length: "deep", giftAmount: 15, giftBrand: "Amazon", signals: ["Manual handoff"] });
  });

  it("clears the brand when there is no gift", () => {
    expect(sanitizePatch({ giftAmount: 0, giftBrand: "Amazon" }, NONE).patch).toEqual({
      giftAmount: 0,
      giftBrand: null,
    });
  });
});

describe("titleImpliesSales", () => {
  it.each([
    "A quick sales conversation",
    "Become a lead for our team",
    "Qualified leads in B2B",
    "Book a demo with us",
    "Why teams buy analytics tools",
    "How buyers choose vendors",
    "Our pitch to operations teams",
    "SALES and marketing alignment",
  ])("rejects %s", (title) => {
    expect(titleImpliesSales(title)).toBe(true);
  });

  it.each([
    "How demand gen leaders hand off to the field",
    "Leadership habits in finance teams",
    "Demographics of remote operations teams",
    "How logistics teams plan the week",
    "Busy seasons in retail operations",
  ])("accepts %s", (title) => {
    expect(titleImpliesSales(title)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

const BRIEF: StudyBrief = {
  internalName: "Attribution habits",
  externalTitle: "How demand gen teams hand off in 2026",
  sponsor: "Birdsong",
  audienceRoles: "Demand gen leaders",
  audienceCompanies: "Series A to C B2B SaaS with an SDR team",
  audienceIndustry: "Software",
  researchQuestion: "How handoffs from marketing to SDRs work today",
  topic: "How marketing and SDR teams work together",
  signals: ["Changing the handoff within two quarters", "Handoff is manual today"],
  offLimits: "Pricing; competitor names",
  publicDescription: "A short conversation about how your team works.",
  length: "deep",
  giftAmount: 15,
  giftBrand: "Amazon",
  respondentFields: ["job_title", "company"],
};

const GUIDE: StructuredGuide = {
  themes: [
    {
      theme: "The last handoff",
      research_intent: "How a record moves from marketing to an SDR",
      signal: "context",
      opening_question: "Walk me through the last record your team passed along.",
      probes: ["Who touched it next?"],
      quantification_probe: "How many of those happen in a week?",
    },
    {
      theme: "Manual steps",
      research_intent: "What is done by hand",
      signal: "pain",
      opening_question: "Tell me about the last thing you did by hand for it.",
      probes: [],
      quantification_probe: "How long did that take?",
    },
  ],
  recommended_title: "How teams hand off",
  recommended_topic: "Marketing to SDR handoffs",
  recommended_custom_fields: [
    { key: "custom_team_size", label: "Team size" },
    { key: "phone", label: "Phone" },
  ],
};

const TRANSCRIPT = [
  { role: "assistant" as const, content: "What do you want to learn?" },
  { role: "user" as const, content: "How handoffs work." },
];

// The keys createSurvey in components/NewStudyWizard.tsx puts in its payload.
const WIZARD_PAYLOAD_KEYS = [
  "title",
  "external_title",
  "sponsor",
  "public_description",
  "topic",
  "target_industry",
  "target_job_title",
  "target_company_size",
  "guide_structured",
  "question_guide",
  "brief_transcript",
  "qualification_criteria",
  "interview_length",
  "gift_card_amount",
  "gift_card_brand",
  "custom_fields",
];

describe("mapToStudy", () => {
  const payload = mapToStudy({ brief: BRIEF, guide: GUIDE, transcript: TRANSCRIPT });

  it("has exactly the keys the wizard writes", () => {
    expect(Object.keys(payload).sort()).toEqual([...WIZARD_PAYLOAD_KEYS].sort());
  });

  it("puts each field where the wizard puts it", () => {
    expect(payload).toMatchObject({
      title: "Attribution habits",
      external_title: "How demand gen teams hand off in 2026",
      sponsor: "Birdsong",
      public_description: "A short conversation about how your team works.",
      // The guide's topic wins over the brief's, as it does in the wizard.
      topic: "Marketing to SDR handoffs",
      target_industry: "Software",
      target_job_title: "Demand gen leaders",
      target_company_size: "Series A to C B2B SaaS with an SDR team",
      qualification_criteria: "1. Changing the handoff within two quarters\n2. Handoff is manual today",
      interview_length: "deep",
      gift_card_amount: 15,
      gift_card_brand: "Amazon",
      guide_structured: GUIDE,
      brief_transcript: TRANSCRIPT,
    });
  });

  it("writes what the conversation was told to collect, then the guide's, never twice", () => {
    expect(payload.custom_fields).toEqual([
      { key: "job_title", label: "Job title", required: false },
      { key: "company", label: "Company name", required: false },
      { key: "custom_team_size", label: "Team size", required: false },
    ]);
  });

  it("collects name and email only when that was the answer", () => {
    const bare = mapToStudy({ brief: { ...BRIEF, respondentFields: [] }, guide: GUIDE, transcript: TRANSCRIPT });
    // The guide's own invention still lands; its "phone" recommendation does
    // not, because the admin was asked and left phone out.
    expect(bare.custom_fields).toEqual([{ key: "custom_team_size", label: "Team size", required: false }]);
  });

  it("does not let the guide put back a preset the admin declined", () => {
    // GUIDE recommends "phone"; this brief asks for job title and company.
    expect((payload.custom_fields as { key: string }[]).map((f) => f.key)).not.toContain("phone");
  });

  it("falls back to the wizard's defaults for a brief that was never asked", () => {
    // A draft restored from before the question existed: null, not empty.
    const older = mapToStudy({ brief: { ...BRIEF, respondentFields: null }, guide: GUIDE, transcript: TRANSCRIPT });
    expect(older.custom_fields).toEqual([
      ...DEFAULT_RESPONDENT_FIELDS,
      { key: "custom_team_size", label: "Team size", required: false },
    ]);
  });

  it("folds off limits into the guide text without adding a topic", () => {
    const text = payload.question_guide ?? "";
    expect(text).toContain("1. The last handoff");
    expect(text).toContain(`${OFF_LIMITS_HEADING}\n- Pricing\n- competitor names`);
    expect(countGuideTopics(text)).toBe(GUIDE.themes.length);
  });

  it("leaves the guide text alone when nothing is off limits", () => {
    const open = mapToStudy({
      brief: { ...BRIEF, offLimits: "Nothing off limits" },
      guide: GUIDE,
      transcript: TRANSCRIPT,
    });
    expect(open.question_guide).not.toContain(OFF_LIMITS_HEADING);
  });

  it("stores nulls where the wizard stores nulls", () => {
    const bare = mapToStudy({
      brief: {
        ...BRIEF,
        sponsor: "",
        publicDescription: "",
        audienceIndustry: "",
        length: null,
        giftAmount: 0,
        giftBrand: "Amazon",
      },
      guide: { ...GUIDE, recommended_topic: "" },
      transcript: [],
    });
    expect(bare).toMatchObject({
      sponsor: null,
      public_description: null,
      target_industry: null,
      topic: BRIEF.topic,
      interview_length: "standard",
      gift_card_amount: null,
      gift_card_brand: null,
    });
  });

  it("gives the guide generator the brief in the wizard's shape", () => {
    expect(toExtractedBrief(BRIEF)).toEqual({
      icpRoles: BRIEF.audienceRoles,
      icpCompanyProfile: BRIEF.audienceCompanies,
      icpIndustry: BRIEF.audienceIndustry,
      researchQuestion: BRIEF.researchQuestion,
      publicTopic: BRIEF.topic,
      sponsorName: BRIEF.sponsor,
      sponsorCredit: "",
      qualificationCriteria: "1. Changing the handoff within two quarters\n2. Handoff is manual today",
    });
  });
});

describe("brief completeness", () => {
  it("is ready to create on the wizard's required fields alone", () => {
    const required: StudyBrief = { ...BRIEF, offLimits: "", length: null, giftAmount: null, giftBrand: null };
    expect(isReadyToCreate(required)).toBe(true);
    expect(isConversationComplete(required)).toBe(false);
    expect(isConversationComplete(BRIEF)).toBe(true);
  });

  it("is not ready without a title, a signal, or a title that makes a slug", () => {
    expect(isReadyToCreate({ ...BRIEF, externalTitle: "" })).toBe(false);
    expect(isReadyToCreate({ ...BRIEF, signals: [] })).toBe(false);
    expect(isReadyToCreate({ ...BRIEF, externalTitle: "???" })).toBe(false);
    expect(isReadyToCreate(EMPTY_BRIEF)).toBe(false);
  });

  it("reads a brief from the browser against the field rules", () => {
    expect(sanitizeBrief({ topic: " Planning ", length: "weekly", extra: true, signals: ["a"] })).toEqual({
      ...EMPTY_BRIEF,
      topic: "Planning",
      signals: ["a"],
    });
    expect(sanitizeBrief(null)).toEqual(EMPTY_BRIEF);
  });
});

// ---------------------------------------------------------------------------

function completion(content: unknown[], stopReason = "end_turn"): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "test",
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

function message(text: string, stopReason = "end_turn"): Anthropic.Message {
  return completion([{ type: "text", text, citations: null }], stopReason);
}

/** What the model actually sends now: a forced brief_turn call. */
function toolMessage(input: unknown, stopReason = "tool_use"): Anthropic.Message {
  return completion([{ type: "tool_use", id: "toolu_test", name: CONVERSE_TOOL_NAME, input }], stopReason);
}

function clientReturning(...replies: string[]) {
  const create = vi.fn();
  for (const reply of replies) create.mockResolvedValueOnce(message(reply));
  return { client: { messages: { create } } as MessagesClient, create };
}

function clientCalling(...inputs: unknown[]) {
  const create = vi.fn();
  for (const input of inputs) create.mockResolvedValueOnce(toolMessage(input));
  return { client: { messages: { create } } as MessagesClient, create };
}

const TURN = {
  system: "system",
  messages: [{ role: "user" as const, content: "How handoffs work." }],
  brief: EMPTY_BRIEF,
  manualKeys: NONE,
  log: { scope: "test", requestId: "test" },
};

describe("runConverseTurn", () => {
  it("forces the brief_turn tool and reads the reply out of the call", async () => {
    const { client, create } = clientCalling(VALID);
    const turn = await runConverseTurn({ client, ...TURN });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      tools: [CONVERSE_TOOL],
      tool_choice: { type: "tool", name: CONVERSE_TOOL_NAME },
      thinking: { type: "disabled" },
    });
    expect(turn).toMatchObject({ ok: true, reply: VALID.reply, patch: VALID.brief_patch, complete: false });
  });

  it("still reads a reply that arrives as text", async () => {
    const { client } = clientReturning(JSON.stringify(VALID));
    const turn = await runConverseTurn({ client, ...TURN });
    expect(turn).toMatchObject({ ok: true, reply: VALID.reply, patch: VALID.brief_patch });
  });

  it("fills the brief from a one line answer, whatever shape the signals take", async () => {
    // The failure this route had: a short answer to "what makes someone
    // worth a call" came back as prose with no patch at all. The tool call
    // carries the patch, and a bare string still reaches the card.
    const { client } = clientCalling({
      reply: "Is anything off limits?",
      chips: [],
      brief_patch: { signals: "Re-evaluating their warehouse this quarter" },
      complete: false,
    });
    const turn = await runConverseTurn({ client, ...TURN });
    expect(turn.ok).toBe(true);
    if (turn.ok) expect(turn.patch.signals).toEqual(["Re-evaluating their warehouse this quarter"]);
  });

  it("retries once when the reply does not parse", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const create = vi
      .fn()
      .mockResolvedValueOnce(toolMessage({ chips: [] }))
      .mockResolvedValueOnce(toolMessage(VALID));
    const turn = await runConverseTurn({ client: { messages: { create } } as MessagesClient, ...TURN });
    expect(create).toHaveBeenCalledTimes(2);
    expect(turn.ok).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("gives up after a second failure and leaves the brief untouched", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client, create } = clientReturning("not json", "{still not json");
    const turn = await runConverseTurn({ client, ...TURN });
    expect(create).toHaveBeenCalledTimes(2);
    expect(turn).toMatchObject({ ok: false, code: "MODEL_UNPARSEABLE" });
    expect(turn).not.toHaveProperty("patch");
    error.mockRestore();
  });

  it("names a reply cut off at max_tokens as its own failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const create = vi.fn().mockResolvedValue(message('{"reply": "Who do you', "max_tokens"));
    const turn = await runConverseTurn({ client: { messages: { create } } as MessagesClient, ...TURN });
    expect(turn).toMatchObject({ ok: false, code: "MODEL_TRUNCATED" });
    expect(error.mock.calls.flat().join(" ")).toContain('"phase":"truncated"');
    error.mockRestore();
  });

  it("logs what the model sent when a turn cannot be used", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = clientReturning("Good, noted. Anything off limits?", "still prose");
    await runConverseTurn({ client, ...TURN });
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("Good, noted. Anything off limits?");
    expect(logged).toContain('"stopReason":"end_turn"');
    expect(logged).toContain('"outputTokens":1');
    expect(logged).toContain('"parseError"');
    error.mockRestore();
  });

  it("regenerates a title that implies sales, once, answering its own tool call", async () => {
    const first = { ...VALID, brief_patch: { externalTitle: "Book a demo with us", topic: "Handoffs" } };
    const second = { ...VALID, brief_patch: { externalTitle: "How teams hand off work" } };
    const { client, create } = clientCalling(first, second);
    const turn = await runConverseTurn({ client, ...TURN });
    expect(create).toHaveBeenCalledTimes(2);
    expect(turn).toMatchObject({
      ok: true,
      patch: { externalTitle: "How teams hand off work", topic: "Handoffs" },
    });
    // A tool call may only be followed by its tool_result.
    const retried = create.mock.calls[1][0].messages;
    expect(retried[retried.length - 2]).toMatchObject({
      role: "assistant",
      content: [{ type: "tool_use", id: "toolu_test" }],
    });
    expect(retried[retried.length - 1]).toMatchObject({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "toolu_test" }],
    });
  });

  it("leaves the title empty when the regenerated one fails too", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const first = { ...VALID, brief_patch: { externalTitle: "Book a demo with us", topic: "Handoffs" } };
    const second = { ...VALID, brief_patch: { externalTitle: "A quick sales pitch" } };
    const { client, create } = clientCalling(first, second);
    const turn = await runConverseTurn({ client, ...TURN });
    expect(create).toHaveBeenCalledTimes(2);
    expect(turn.ok).toBe(true);
    if (turn.ok) {
      expect(turn.patch).toEqual({ topic: "Handoffs" });
      expect(turn.dropped.title).toBe(true);
    }
    error.mockRestore();
  });

  it("never patches a field the admin edited, whatever the model returns", async () => {
    const { client } = clientCalling({ ...VALID, brief_patch: { internalName: "Model's name", topic: "Handoffs" } });
    const turn = await runConverseTurn({
      client,
      ...TURN,
      manualKeys: new Set<BriefFieldKey>(["internalName"]),
    });
    expect(turn.ok).toBe(true);
    if (turn.ok) expect(turn.patch).toEqual({ topic: "Handoffs" });
  });
});

describe("CONVERSE_TOOL", () => {
  it("lets the model send every brief field, and nothing is required of the patch", () => {
    const patch = (CONVERSE_TOOL.input_schema.properties as Record<string, { properties: object }>).brief_patch;
    expect(Object.keys(patch.properties).sort()).toEqual([...BRIEF_FIELD_KEYS].sort());
    expect(CONVERSE_TOOL.input_schema.required).toEqual(["reply", "chips", "brief_patch", "complete"]);
  });

  it("asks for the signals as a list of strings", () => {
    const patch = (CONVERSE_TOOL.input_schema.properties as Record<string, { properties: Record<string, unknown> }>)
      .brief_patch;
    expect(patch.properties.signals).toEqual({ type: "array", items: { type: "string" } });
  });
});
