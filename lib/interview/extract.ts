import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "./anthropic";
import type { InterviewMessage } from "./types";

export type CallScript = {
  opener: string;
  talkingPoints: string[];
};

export type InterviewInsights = {
  painPoints: string[];
  leadScore: number;
  summary: string;
  callScript: CallScript;
};

const FALLBACK_INSIGHTS: InterviewInsights = {
  painPoints: [],
  leadScore: 5,
  summary: "",
  callScript: { opener: "", talkingPoints: [] },
};

const EXTRACTION_SYSTEM_PROMPT = `You analyze a completed market research interview transcript and extract structured insights for the sales rep who will follow up with this respondent. You are an analyst, not the interviewer, and you never address the respondent directly.

Score the lead from 1 to 10 using this rubric:
- 9-10: the respondent mentioned budget, timeline, or being actively in the market for a solution.
- 7-8: the respondent described clear, implicit friction or unmet needs without being asked directly.
- 5-6: mild friction can be inferred, but was not stated directly.
- 3-4: the respondent was mostly positive with little to no friction.
- 1-2: nothing relevant to friction or need came up.
If you are uncertain where the interview falls, default conservatively to 5.

Also list the distinct pain points, challenges, or frustrations the respondent actually expressed, phrased in or close to their own words. If none were expressed, return an empty list.

Write a one to two sentence summary of the interview a rep can read in a few seconds before a call.

Write a call script for the rep:
- opener: one to two sentences the rep can literally say to open the call. Reference something specific and true from this transcript (a tool they mentioned, a workflow they described, something they said), never a generic opener that could apply to any respondent.
- talking_points: the 2 to 3 most glaring pain points from this specific interview, phrased as short things for the rep to bring up in conversation, not a restatement of the pain_points list.

Call the record_interview_insights tool exactly once with your findings.`;

const INSIGHTS_TOOL: Anthropic.Tool = {
  name: "record_interview_insights",
  description:
    "Record the pain points, lead score, summary, and call script extracted from a completed interview transcript.",
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
      summary: {
        type: "string",
        description: "A one to two sentence summary of the interview for a rep to skim.",
      },
      call_script: {
        type: "object",
        properties: {
          opener: {
            type: "string",
            description:
              "One to two sentences the rep can say to open the call, referencing something specific from this transcript.",
          },
          talking_points: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 3,
            description: "The 2 to 3 most glaring pain points from this interview, phrased as talking points.",
          },
        },
        required: ["opener", "talking_points"],
      },
    },
    required: ["pain_points", "lead_score", "summary", "call_script"],
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

  const input = toolUse.input as {
    pain_points?: unknown;
    lead_score?: unknown;
    summary?: unknown;
    call_script?: unknown;
  };

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

  const summary = typeof input.summary === "string" ? input.summary : FALLBACK_INSIGHTS.summary;

  const rawCallScript = input.call_script as { opener?: unknown; talking_points?: unknown } | undefined;
  const callScript: CallScript = {
    opener: typeof rawCallScript?.opener === "string" ? rawCallScript.opener : "",
    talkingPoints: Array.isArray(rawCallScript?.talking_points)
      ? rawCallScript.talking_points.filter((p): p is string => typeof p === "string").slice(0, 3)
      : [],
  };

  return { painPoints, leadScore, summary, callScript };
}
