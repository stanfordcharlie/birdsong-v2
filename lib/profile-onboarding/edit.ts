import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { CompanyProfileEditFields } from "./company-profile-fields";

export type { CompanyProfileEditFields } from "./company-profile-fields";

export type ProfileEditResult = {
  updated: CompanyProfileEditFields;
  confirmation: string;
};

const EDIT_SYSTEM_PROMPT = `You help an admin edit their own company's profile inside a product they use, based on a plain-language instruction describing what they want changed.

You'll be given the current profile (company name, industry, website, team size, what they sell, target ICP, value proposition, brand voice) and an instruction. Apply the requested change precisely; leave every other field exactly as it currently is unless the instruction clearly implies a broader change. Don't invent details the admin didn't provide or imply, and never use em dashes in your writing.

brand_voice is a short list of tone descriptors in the admin's own words, comma-separated (e.g. "Warm, plainspoken, curious"). Only change it if the instruction clearly asks for a different tone; otherwise keep the current value exactly as-is.

Call the record_company_profile tool with the full updated profile (all eight fields, whether changed or not) plus a one-sentence confirmation of what you changed, written directly to the admin (e.g. "Updated your value prop to mention the new AI feature.").`;

const EDIT_TOOL: Anthropic.Tool = {
  name: "record_company_profile",
  description: "Record the company's updated profile after applying the requested edit.",
  input_schema: {
    type: "object",
    properties: {
      company_name: { type: "string" },
      industry: { type: "string" },
      website: { type: "string" },
      team_size: { type: "string" },
      what_we_sell: { type: "string" },
      target_icp: { type: "string" },
      value_prop: { type: "string" },
      brand_voice: { type: "string" },
      confirmation: {
        type: "string",
        description: "One short sentence confirming what changed, written directly to the admin.",
      },
    },
    required: [
      "company_name",
      "industry",
      "website",
      "team_size",
      "what_we_sell",
      "target_icp",
      "value_prop",
      "brand_voice",
      "confirmation",
    ],
  },
};

// Unlike extractProfile (which builds a profile from scratch out of a full
// onboarding transcript), this takes the profile as it exists right now
// plus a single instruction, and returns the whole profile back with just
// the requested change applied. Stateless by design: the caller's current
// field values already are the accumulated state between edits, so no
// running conversation history needs to be tracked or resent.
export async function editProfile(
  current: CompanyProfileEditFields,
  instruction: string
): Promise<ProfileEditResult> {
  const anthropic = getAnthropicClient();

  const contextMessage = `Current profile:
- Company name: ${current.companyName || "(not set)"}
- Industry: ${current.industry || "(not set)"}
- Website: ${current.website || "(not set)"}
- Team size: ${current.teamSize || "(not set)"}
- What they sell: ${current.whatWeSell || "(not set)"}
- Target ICP: ${current.targetIcp || "(not set)"}
- Value proposition: ${current.valueProp || "(not set)"}
- Brand voice: ${current.brandVoice || "(not set)"}

Instruction: ${instruction}`;

  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system: EDIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: contextMessage }],
    tools: [EDIT_TOOL],
    tool_choice: { type: "tool", name: "record_company_profile" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Failed to apply the requested edit");
  }

  const input = toolUse.input as Record<string, unknown>;

  return {
    updated: {
      companyName:
        typeof input.company_name === "string" ? input.company_name : current.companyName,
      industry: typeof input.industry === "string" ? input.industry : current.industry,
      website: typeof input.website === "string" ? input.website : current.website,
      teamSize: typeof input.team_size === "string" ? input.team_size : current.teamSize,
      whatWeSell:
        typeof input.what_we_sell === "string" ? input.what_we_sell : current.whatWeSell,
      targetIcp: typeof input.target_icp === "string" ? input.target_icp : current.targetIcp,
      valueProp: typeof input.value_prop === "string" ? input.value_prop : current.valueProp,
      brandVoice: typeof input.brand_voice === "string" ? input.brand_voice : current.brandVoice,
    },
    confirmation:
      typeof input.confirmation === "string" ? input.confirmation : "Updated your profile.",
  };
}
