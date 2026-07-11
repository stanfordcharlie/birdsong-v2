import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { ExtractedProfile } from "./extract";

export type ProfileEditResult = {
  updated: ExtractedProfile;
  confirmation: string;
};

const EDIT_SYSTEM_PROMPT = `You help an admin edit their own company's profile inside a product they use, based on a plain-language instruction describing what they want changed.

You'll be given the current profile (company name, what they sell, target ICP, value proposition) and an instruction. Apply the requested change precisely; leave every other field exactly as it currently is unless the instruction clearly implies a broader change. Don't invent details the admin didn't provide or imply, and never use em dashes in your writing.

Call the record_company_profile tool with the full updated profile (all four fields, whether changed or not) plus a one-sentence confirmation of what you changed, written directly to the admin (e.g. "Updated your value prop to mention the new AI feature.").`;

const EDIT_TOOL: Anthropic.Tool = {
  name: "record_company_profile",
  description: "Record the company's updated profile after applying the requested edit.",
  input_schema: {
    type: "object",
    properties: {
      company_name: { type: "string" },
      what_we_sell: { type: "string" },
      target_icp: { type: "string" },
      value_prop: { type: "string" },
      confirmation: {
        type: "string",
        description: "One short sentence confirming what changed, written directly to the admin.",
      },
    },
    required: ["company_name", "what_we_sell", "target_icp", "value_prop", "confirmation"],
  },
};

// Unlike extractProfile (which builds a profile from scratch out of a full
// onboarding transcript), this takes the profile as it exists right now
// plus a single instruction, and returns the whole profile back with just
// the requested change applied. Stateless by design: the caller's current
// field values already are the accumulated state between edits, so no
// running conversation history needs to be tracked or resent.
export async function editProfile(
  current: ExtractedProfile,
  instruction: string
): Promise<ProfileEditResult> {
  const anthropic = getAnthropicClient();

  const contextMessage = `Current profile:
- Company name: ${current.companyName || "(not set)"}
- What they sell: ${current.whatWeSell || "(not set)"}
- Target ICP: ${current.targetIcp || "(not set)"}
- Value proposition: ${current.valueProp || "(not set)"}

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
      whatWeSell:
        typeof input.what_we_sell === "string" ? input.what_we_sell : current.whatWeSell,
      targetIcp: typeof input.target_icp === "string" ? input.target_icp : current.targetIcp,
      valueProp: typeof input.value_prop === "string" ? input.value_prop : current.valueProp,
    },
    confirmation:
      typeof input.confirmation === "string" ? input.confirmation : "Updated your profile.",
  };
}
