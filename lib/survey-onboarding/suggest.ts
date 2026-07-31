import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { ExtractedSurveyDetails } from "./types";

// AI suggestions for the two respondent-facing wizard steps (external name,
// public description), generated from the survey's substance so they read
// like real industry research, never like marketing. Both reuse the same
// Claude client/model as the rest of survey onboarding (see
// lib/survey-onboarding/extract.ts) and the same tool-use resilience shape:
// forced tool_choice, one retry, loud logs, then throw (no fallback content
// worth persisting here since a caller-side failure just means "no
// suggestions" rather than broken data, see the API routes).
//
// RESPONDENT-FACING COPY RULE: never mention or deny sales intent.
// No "sales", "pitch", "leads", "not a sales call", etc. Also never claim
// their info is "only" used for X, or make any exclusive-use / "never
// shared" claim — state true things we WILL do, don't enumerate or limit
// what else happens.

type SurveyDetailsInput = Pick<
  ExtractedSurveyDetails,
  "topic" | "targetIndustry" | "targetJobTitle" | "targetCompanySize" | "tone"
>;

function buildDetailsSummary(details: SurveyDetailsInput): string {
  const lines: string[] = [];
  if (details.topic?.trim()) lines.push(`Research topic: ${details.topic.trim()}`);
  const audience = [details.targetJobTitle, details.targetIndustry, details.targetCompanySize]
    .filter((v) => v?.trim())
    .join(", ");
  if (audience) lines.push(`Target audience: ${audience}`);
  if (details.tone) lines.push(`Interview tone: ${details.tone}`);
  return lines.join("\n");
}

const NAME_SUGGESTION_SYSTEM_PROMPT = `You write survey titles for a market research platform. Respondents see this title on the survey's public landing page before they decide whether to join a short interview, so it must sound like a real researcher describing the study out loud in plain conversational language. Never like a whitepaper title, a marketing headline, or lead generation copy.

You will be given the research topic, the target audience, and sometimes the sponsoring company's industry.

Rules, all of them strict:
- Never include a company name, product name, or brand name anywhere in the title, even if one was mentioned in the details. This is what keeps it reading as independent research rather than something a vendor is running.
- Never use the words "sales", "selling", "pitch", "lead"/"leads", "pipeline", or "vendor", and never phrase the title as a denial of any of those (e.g. "not a sales survey"). Describe the actual subject matter in plain terms instead of the sales-process vocabulary around it.
- Max 8 words.
- No colons, and no subtitle construction like "X: A Study Among Y". Write one plain phrase, not a headline stacked on a clarifier.
- Sentence case only: capitalize the first word and proper nouns, nothing else.
- No jargon or acronyms a respondent shouldn't need to decode: never use MQL, SQL, ICP, "demand gen", "pipeline contribution", "handoff practices", "organizations", "practices", "evaluation", or words in that register. An acronym is only allowed if the target audience uses it daily AND it already appears verbatim in the research topic you were given.
- No exclamation points, no superlatives, no marketing adjectives like revolutionary, game changing, or ultimate. Never use em dashes.
- Write the way you'd describe the study to a friend, not the way you'd title a report. Good register: "How marketing and support teams handle new customer requests", "What happens after someone reaches out", "How teams decide who to follow up with first". Bad, do not do this: "Inbound Pipeline Contribution: A Study Among B2B SaaS Demand Gen Leaders", "MQL to SQL Handoff Practices in Early Stage SaaS Organizations".
- Vary the register and angle across your three suggestions rather than reusing one pattern or angle three times.

Generate exactly 3 distinct title suggestions.

Call the record_title_suggestions tool exactly once with your three suggestions.`;

const NAME_SUGGESTIONS_TOOL: Anthropic.Tool = {
  name: "record_title_suggestions",
  description: "Record three suggested, research-styled survey titles.",
  input_schema: {
    type: "object",
    properties: {
      titles: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 3,
        description: "Exactly three distinct, research-styled survey title suggestions.",
      },
    },
    required: ["titles"],
  },
};

export async function suggestSurveyNames(
  details: SurveyDetailsInput,
  companyIndustry: string | null
): Promise<string[]> {
  const anthropic = getAnthropicClient();
  const detailsSummary = buildDetailsSummary(details);
  const industryLine = companyIndustry?.trim() ? `\nSponsor's industry: ${companyIndustry.trim()}` : "";
  const userMessage =
    `${detailsSummary}${industryLine}`.trim() ||
    "No survey details were given yet. Suggest generic but plausible research-study titles.";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await anthropic.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 512,
      system: NAME_SUGGESTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [NAME_SUGGESTIONS_TOOL],
      tool_choice: { type: "tool", name: "record_title_suggestions" },
    });
    const toolUse = result.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const rawTitles = (toolUse?.input as { titles?: unknown } | undefined)?.titles;
    const titles = Array.isArray(rawTitles)
      ? rawTitles.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [];
    if (titles.length > 0) return titles.slice(0, 3);
    console.error(
      `[suggestSurveyNames] attempt ${attempt} failed to produce valid titles; ` +
        `${attempt < 2 ? "retrying once" : "giving up after retry"}`
    );
  }

  throw new Error("Failed to generate name suggestions");
}

const DESCRIPTION_SUGGESTION_SYSTEM_PROMPT = `You write the public description shown on a market research survey's landing page. A respondent reads this before deciding whether to join a short interview.

You will be given the survey's chosen title, the research topic, and the target audience.

Write exactly one or two short sentences, in plain conversational language, describing what the conversation is actually about from the respondent's point of view. Rules, all of them strict:
- Max 40 words total.
- Neutral, research framing: it should read like the description under a legitimate industry study. Describe what the conversation IS, never what it is not — do not add reassurances like "not a sales call" or "no strings attached"; denying something plants the suspicion it's trying to avoid.
- Never use the words "sales", "selling", "pitch", "lead"/"leads", "pipeline", or "vendor". Never mention a product, the sponsor's business goals, or the respondent's pain points as something being diagnosed in order to sell them something.
- No jargon or acronyms a respondent shouldn't need to decode: never use MQL, SQL, ICP, "demand gen", "pipeline contribution", "handoff practices", "organizations", "practices", "evaluation", or words in that register. An acronym is only allowed if the target audience uses it daily AND it already appears verbatim in the research topic you were given.
- Inviting but plain, the way you'd describe the study to a friend. No exclamation points, no hype, no marketing adjectives.
- Never use em dashes.

Call the record_description_suggestion tool exactly once with your suggestion.`;

const DESCRIPTION_SUGGESTION_TOOL: Anthropic.Tool = {
  name: "record_description_suggestion",
  description: "Record one suggested public description for the survey landing page.",
  input_schema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "One to two sentences, neutral and research-framed, from the respondent's point of view.",
      },
    },
    required: ["description"],
  },
};

export async function suggestSurveyDescription(
  details: SurveyDetailsInput,
  externalTitle: string
): Promise<string> {
  const anthropic = getAnthropicClient();
  const detailsSummary = buildDetailsSummary(details);
  const userMessage = `Survey title: ${externalTitle.trim()}\n${detailsSummary}`.trim();

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await anthropic.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 300,
      system: DESCRIPTION_SUGGESTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [DESCRIPTION_SUGGESTION_TOOL],
      tool_choice: { type: "tool", name: "record_description_suggestion" },
    });
    const toolUse = result.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const rawDescription = (toolUse?.input as { description?: unknown } | undefined)?.description;
    const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
    if (description) return description;
    console.error(
      `[suggestSurveyDescription] attempt ${attempt} failed to produce a valid description; ` +
        `${attempt < 2 ? "retrying once" : "giving up after retry"}`
    );
  }

  throw new Error("Failed to generate a description suggestion");
}
