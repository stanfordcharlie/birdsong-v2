import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { BriefMessage, ExtractedBrief } from "./types";

export const EMPTY_BRIEF: ExtractedBrief = {
  icpRoles: "",
  icpCompanyProfile: "",
  icpIndustry: "",
  researchQuestion: "",
  publicTopic: "",
  sponsorName: "",
  sponsorCredit: "",
  qualificationCriteria: "",
};

const SYSTEM_PROMPT = `You extract structured intake details from a conversation between an assistant and a business customer describing the research study they want to commission.

Fill in only what the customer actually said or confirmed. This is the rule that matters: a field you invent silently becomes the foundation of a generated research guide, so leaving a field empty is always better than filling it with a plausible guess. If something was asked but the answer was too vague to build research from ("B2B SaaS", "we want to understand our market"), leave the field empty.

Fields:
- icp_roles: the roles or job titles they sell to.
- icp_company_profile: the company profile of their buyers, e.g. size, stage, or shape.
- icp_industry: the industry, if named.
- research_question: what they genuinely want to learn, internal framing, in their own words.
- public_topic: what the study is publicly about, as a respondent would see it. Neutral, no sales framing.
- sponsor_name: the company sponsoring the research.
- sponsor_credit: how they want to be credited to respondents, if stated.
- qualification_criteria: what makes a respondent worth a sales conversation for them.

Use their own words, lightly cleaned into complete phrases.

An unanswered field is an EMPTY STRING. Never write a placeholder in its place: not "unknown", not "<UNKNOWN>", not "N/A", not "TBD", not "not stated", not a dash. A placeholder reads to the caller as a real answer and ends the conversation early with nothing collected.

Call record_brief exactly once.`;

const BRIEF_TOOL: Anthropic.Tool = {
  name: "record_brief",
  description: "Record the extracted research brief details.",
  input_schema: {
    type: "object",
    properties: {
      icp_roles: { type: "string" },
      icp_company_profile: { type: "string" },
      icp_industry: { type: "string" },
      research_question: { type: "string" },
      public_topic: { type: "string" },
      sponsor_name: { type: "string" },
      sponsor_credit: { type: "string" },
      qualification_criteria: { type: "string" },
    },
    required: [
      "icp_roles",
      "icp_company_profile",
      "icp_industry",
      "research_question",
      "public_topic",
      "sponsor_name",
      "sponsor_credit",
      "qualification_criteria",
    ],
  },
};

function transcriptToText(messages: BriefMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "Customer"}: ${m.content}`)
    .join("\n\n");
}

/**
 * Stand-ins a model reaches for when it has nothing to record. These have to
 * collapse to empty, because an empty field is the ONLY thing keeping the
 * chat going: a literal "<UNKNOWN>" counts as an answer to
 * isBriefComplete, which ended a real test run after a single exchange with
 * six of eight fields uncollected.
 */
const PLACEHOLDERS = new Set([
  "",
  "-",
  "--",
  "?",
  "n/a",
  "na",
  "none",
  "null",
  "unknown",
  "<unknown>",
  "not stated",
  "not specified",
  "not mentioned",
  "not provided",
  "not discussed",
  "tbd",
  "unclear",
]);

function str(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return PLACEHOLDERS.has(trimmed.toLowerCase().replace(/[.]+$/, "")) ? "" : trimmed;
}

/**
 * Runs after every user turn once the chat is past its opening exchanges.
 * The result is what decides whether the chat terminates, so this is the
 * deterministic half of "terminate once the required fields are filled":
 * the model chooses what counts as answered, the route checks the fields.
 */
export async function extractBrief(messages: BriefMessage[]): Promise<ExtractedBrief> {
  const anthropic = getAnthropicClient();

  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcriptToText(messages) }],
    tools: [BRIEF_TOOL],
    tool_choice: { type: "tool", name: "record_brief" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return EMPTY_BRIEF;

  const input = toolUse.input as Record<string, unknown>;
  return {
    icpRoles: str(input, "icp_roles"),
    icpCompanyProfile: str(input, "icp_company_profile"),
    icpIndustry: str(input, "icp_industry"),
    researchQuestion: str(input, "research_question"),
    publicTopic: str(input, "public_topic"),
    sponsorName: str(input, "sponsor_name"),
    sponsorCredit: str(input, "sponsor_credit"),
    qualificationCriteria: str(input, "qualification_criteria"),
  };
}
