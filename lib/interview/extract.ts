import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "./anthropic";
import type { InterviewMessage } from "./types";

export type InterviewInsights = {
  painPoints: string[];
  leadScore: number;
};

const FALLBACK_INSIGHTS: InterviewInsights = { painPoints: [], leadScore: 5 };

const EXTRACTION_SYSTEM_PROMPT = `You analyze a completed market research interview transcript and extract structured insights. You are an analyst, not the interviewer, and you never address the respondent directly.

Score the lead from 1 to 10 using this rubric:
- 9-10: the respondent mentioned budget, timeline, or being actively in the market for a solution.
- 7-8: the respondent described clear, implicit friction or unmet needs without being asked directly.
- 5-6: mild friction can be inferred, but was not stated directly.
- 3-4: the respondent was mostly positive with little to no friction.
- 1-2: nothing relevant to friction or need came up.
If you are uncertain where the interview falls, default conservatively to 5.

Also list the distinct pain points, challenges, or frustrations the respondent actually expressed, phrased in or close to their own words. If none were expressed, return an empty list.

Call the record_interview_insights tool exactly once with your findings.`;

const INSIGHTS_TOOL: Anthropic.Tool = {
  name: "record_interview_insights",
  description: "Record the pain points and lead score extracted from a completed interview transcript.",
  input_schema: {
    type: "object",
    properties: {
      pain_points: {
        type: "array",
        items: { type: "string" },
        description:
          "Distinct pain points, challenges, or frustrations the respondent expressed, in or close to their own words. Empty array if none.",
      },
      lead_score: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Lead score from 1 to 10 per the rubric.",
      },
    },
    required: ["pain_points", "lead_score"],
  },
};

function transcriptToText(messages: InterviewMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Respondent"}: ${m.content}`)
    .join("\n\n");
}

export async function extractInterviewInsights(
  messages: InterviewMessage[]
): Promise<InterviewInsights> {
  const anthropic = getAnthropicClient();

  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcriptToText(messages) }],
    tools: [INSIGHTS_TOOL],
    tool_choice: { type: "tool", name: "record_interview_insights" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return FALLBACK_INSIGHTS;

  const input = toolUse.input as { pain_points?: unknown; lead_score?: unknown };

  const painPoints = Array.isArray(input.pain_points)
    ? input.pain_points.filter((p): p is string => typeof p === "string")
    : FALLBACK_INSIGHTS.painPoints;

  const leadScore =
    typeof input.lead_score === "number" &&
    Number.isInteger(input.lead_score) &&
    input.lead_score >= 1 &&
    input.lead_score <= 10
      ? input.lead_score
      : FALLBACK_INSIGHTS.leadScore;

  return { painPoints, leadScore };
}
