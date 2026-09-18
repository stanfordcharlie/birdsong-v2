import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import { SURVEY_TONE_OPTIONS, type SurveyOnboardingMessage, type SurveyTone } from "./types";

export type ExtractedSurveySetup = {
  topic: string;
  targetIndustry: string;
  targetJobTitle: string;
  targetCompanySize: string;
  tone: SurveyTone;
  numQuestions: number;
};

const FALLBACK: ExtractedSurveySetup = {
  topic: "",
  targetIndustry: "",
  targetJobTitle: "",
  targetCompanySize: "",
  tone: "Conversational",
  numQuestions: 8,
};

const EXTRACTION_SYSTEM_PROMPT = `You extract structured survey setup details from a conversation between an AI assistant and an admin describing the market research survey they want to run.

Fill in:
- topic: the research theme, what they want to learn, as a concise description.
- target_industry: the industry of the respondents this survey should target.
- target_job_title: the job title or role of the respondents this survey should target.
- target_company_size: the company size range of the respondents this survey should target, in their own words.
- tone: the interview tone, one of Conversational, Peer-to-peer, or Academic, whichever best matches what they described.
- num_questions: roughly how many questions the interview should run, as an integer.

Use the admin's own words and phrasing where possible, lightly cleaned up into complete phrases. If something genuinely wasn't discussed, leave that field as an empty string (or default num_questions to 8) rather than inventing content.

Call the record_survey_setup tool exactly once with your findings.`;

const SURVEY_SETUP_TOOL: Anthropic.Tool = {
  name: "record_survey_setup",
  description: "Record the extracted survey setup details from the onboarding conversation.",
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string" },
      target_industry: { type: "string" },
      target_job_title: { type: "string" },
      target_company_size: { type: "string" },
      tone: { type: "string", enum: [...SURVEY_TONE_OPTIONS] },
      num_questions: { type: "integer" },
    },
    required: [
      "topic",
      "target_industry",
      "target_job_title",
      "target_company_size",
      "tone",
      "num_questions",
    ],
  },
};

function transcriptToText(messages: SurveyOnboardingMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "Admin"}: ${m.content}`)
    .join("\n\n");
}

export async function extractSurveySetup(
  messages: SurveyOnboardingMessage[]
): Promise<ExtractedSurveySetup> {
  const anthropic = getAnthropicClient();

  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcriptToText(messages) }],
    tools: [SURVEY_SETUP_TOOL],
    tool_choice: { type: "tool", name: "record_survey_setup" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return FALLBACK;

  const input = toolUse.input as Record<string, unknown>;
  const tone = SURVEY_TONE_OPTIONS.includes(input.tone as SurveyTone)
    ? (input.tone as SurveyTone)
    : FALLBACK.tone;

  return {
    topic: typeof input.topic === "string" ? input.topic : "",
    targetIndustry: typeof input.target_industry === "string" ? input.target_industry : "",
    targetJobTitle: typeof input.target_job_title === "string" ? input.target_job_title : "",
    targetCompanySize:
      typeof input.target_company_size === "string" ? input.target_company_size : "",
    tone,
    numQuestions:
      typeof input.num_questions === "number" && Number.isFinite(input.num_questions)
        ? Math.round(input.num_questions)
        : FALLBACK.numQuestions,
  };
}
