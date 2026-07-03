import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { OnboardingMessage } from "./types";

export type ExtractedProfile = {
  companyName: string;
  whatWeSell: string;
  targetIcp: string;
  valueProp: string;
};

const FALLBACK: ExtractedProfile = {
  companyName: "",
  whatWeSell: "",
  targetIcp: "",
  valueProp: "",
};

const EXTRACTION_SYSTEM_PROMPT = `You extract a structured company profile from a conversation between an AI assistant and an admin describing their own company.

Fill in:
- company_name: the company's name, as given.
- what_we_sell: a concise description of their product or service.
- target_icp: their target customer profile (industry, company size, roles) in their own words.
- value_prop: their core value proposition, what makes them different.

Use the admin's own words and phrasing where possible, lightly cleaned up into complete sentences. If something genuinely wasn't discussed, leave that field as an empty string rather than inventing content.

Call the record_company_profile tool exactly once with your findings.`;

const PROFILE_TOOL: Anthropic.Tool = {
  name: "record_company_profile",
  description: "Record the extracted company profile fields from the onboarding conversation.",
  input_schema: {
    type: "object",
    properties: {
      company_name: { type: "string" },
      what_we_sell: { type: "string" },
      target_icp: { type: "string" },
      value_prop: { type: "string" },
    },
    required: ["company_name", "what_we_sell", "target_icp", "value_prop"],
  },
};

function transcriptToText(messages: OnboardingMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "Admin"}: ${m.content}`)
    .join("\n\n");
}

export async function extractProfile(messages: OnboardingMessage[]): Promise<ExtractedProfile> {
  const anthropic = getAnthropicClient();

  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcriptToText(messages) }],
    tools: [PROFILE_TOOL],
    tool_choice: { type: "tool", name: "record_company_profile" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return FALLBACK;

  const input = toolUse.input as Record<string, unknown>;

  return {
    companyName: typeof input.company_name === "string" ? input.company_name : "",
    whatWeSell: typeof input.what_we_sell === "string" ? input.what_we_sell : "",
    targetIcp: typeof input.target_icp === "string" ? input.target_icp : "",
    valueProp: typeof input.value_prop === "string" ? input.value_prop : "",
  };
}
