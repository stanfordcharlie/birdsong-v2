import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "./anthropic";
import type { InterviewMessage } from "./types";

export type CallScript = {
  opener: string;
  talkingPoints: string[];
};

export type Signals = {
  economicBuyer: string | null;
  decisionCriteria: string | null;
  decisionProcess: string | null;
  metrics: string | null;
  champion: string | null;
};

export type CompanyProfile = {
  whatWeSell: string | null;
  targetIcp: string | null;
  valueProp: string | null;
};

export type InterviewInsights = {
  painPoints: string[];
  leadScore: number;
  fitReason: string;
  summary: string;
  callScript: CallScript;
  signals: Signals;
};

const EMPTY_SIGNALS: Signals = {
  economicBuyer: null,
  decisionCriteria: null,
  decisionProcess: null,
  metrics: null,
  champion: null,
};

const FALLBACK_INSIGHTS: InterviewInsights = {
  painPoints: [],
  leadScore: 5,
  fitReason: "",
  summary: "",
  callScript: { opener: "", talkingPoints: [] },
  signals: EMPTY_SIGNALS,
};

function buildExtractionSystemPrompt(companyProfile: CompanyProfile | null): string {
  const profileParts: string[] = [];
  if (companyProfile?.whatWeSell) profileParts.push(`sells: ${companyProfile.whatWeSell}`);
  if (companyProfile?.targetIcp) profileParts.push(`targets customers like: ${companyProfile.targetIcp}`);
  if (companyProfile?.valueProp) profileParts.push(`value proposition: ${companyProfile.valueProp}`);

  const productSection =
    profileParts.length > 0
      ? `\nThis interview was commissioned by a sponsor company that ${profileParts.join("; ")}. Use this to judge fit and to write a call script specific to what this sponsor actually sells, not a generic one.\n`
      : "\nNo sponsor product information is available for this interview. Score and write the call script based on friction alone, without inferring a specific product to sell against.\n";

  return `You analyze a completed market research interview transcript and extract structured insights for the sales rep who will follow up with this respondent. You are an analyst, not the interviewer, and you never address the respondent directly.
${productSection}
Score the lead from 1 to 10. This score means fit AND friction for the sponsor's specific product above, not generic friction:
- 9-10: the respondent described friction or unmet needs that the sponsor's product specifically addresses, and they plausibly fit the sponsor's target ICP.
- 7-8: clear, implicit friction connected to what the sponsor sells, even if fit with the ICP is only partial or unstated.
- 5-6: mild friction can be inferred but it's not clearly connected to the sponsor's product, or fit with the ICP is unclear either way.
- 3-4: the respondent was mostly positive, or any friction they described falls outside what the sponsor's product addresses.
- 1-2: nothing relevant to the sponsor's product came up, or the respondent clearly doesn't fit the ICP.
If you are uncertain where the interview falls, default conservatively to 5. If no sponsor product information was provided above, fall back to scoring generic friction only, using the same rubric shape.

Also write fit_reason: one sentence explaining why this respondent is or isn't a fit for the sponsor's product specifically (not just whether they have friction in general). If no sponsor product information was provided, say so plainly rather than guessing at a product.

Also list the distinct pain points, challenges, or frustrations the respondent actually expressed, phrased in or close to their own words. If none were expressed, return an empty list.

Write a one to two sentence summary of the interview a rep can read in a few seconds before a call.

Also pull out whatever deal signals the transcript actually surfaced, as a signals object with five fields. Only populate a field if the interview actually surfaced it; leave the rest null. Don't force an answer that isn't there, and don't infer one from a single passing remark:
- economic_buyer: who would actually have the budget or authority to approve something like this, if that came up.
- decision_criteria: what would matter most to them in picking something new, if they said so.
- decision_process: how a decision like this would actually get made, who's involved, what steps, if that surfaced.
- metrics: how they'd measure success or ROI, any numbers or measurable outcomes they mentioned.
- champion: who internally would advocate for or drive this forward, if someone was named.

Write a call script for the rep:
- opener: one to two sentences the rep can literally say to open the call. Connect something specific and true the respondent said (a tool they mentioned, a workflow they described, a frustration in their own words) to the sponsor's actual value proposition above. Never a generic opener that could apply to any respondent, and never a generic pitch that ignores what this respondent specifically said. When any of the signals surfaced something relevant, let it naturally inform the opener or a talking point instead of listing it separately.
- talking_points: the 2 to 3 most glaring pain points from this specific interview, each phrased as a bridge from something the respondent actually said (quote or closely paraphrase their own words) to how the sponsor's product addresses it. Not a restatement of the pain_points list.

Call the record_interview_insights tool exactly once with your findings.`;
}

const INSIGHTS_TOOL: Anthropic.Tool = {
  name: "record_interview_insights",
  description:
    "Record the pain points, lead score, fit reason, summary, and call script extracted from a completed interview transcript.",
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
        description: "Lead score from 1 to 10 per the rubric: fit and friction for the sponsor's specific product.",
      },
      fit_reason: {
        type: "string",
        description:
          "One sentence explaining why this respondent is or isn't a fit for the sponsor's product specifically.",
      },
      summary: {
        type: "string",
        description: "A one to two sentence summary of the interview for a rep to skim.",
      },
      signals: {
        type: "object",
        description:
          "Deal signals actually surfaced in the interview. Omit a field entirely if the interview didn't surface it, don't force one.",
        properties: {
          economic_buyer: {
            type: "string",
            description: "Who would have the budget or authority to approve this, if that came up. Omit if not surfaced.",
          },
          decision_criteria: {
            type: "string",
            description: "What would matter most to them in picking something new, if they said so. Omit if not surfaced.",
          },
          decision_process: {
            type: "string",
            description: "How a decision like this would actually get made, if that surfaced. Omit if not surfaced.",
          },
          metrics: {
            type: "string",
            description: "How they'd measure success or ROI, any numbers or measurable outcomes mentioned. Omit if not surfaced.",
          },
          champion: {
            type: "string",
            description: "Who internally would advocate for or drive this forward, if someone was named. Omit if not surfaced.",
          },
        },
      },
      call_script: {
        type: "object",
        properties: {
          opener: {
            type: "string",
            description:
              "One to two sentences the rep can say to open the call, connecting something specific from this transcript to the sponsor's value proposition.",
          },
          talking_points: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 3,
            description:
              "The 2 to 3 most glaring pain points from this interview, each bridging what the respondent said to the sponsor's product.",
          },
        },
        required: ["opener", "talking_points"],
      },
    },
    required: ["pain_points", "lead_score", "fit_reason", "summary", "call_script"],
  },
};

function transcriptToText(messages: InterviewMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Respondent"}: ${m.content}`)
    .join("\n\n");
}

type ParsedToolInput = {
  pain_points?: unknown;
  lead_score?: unknown;
  fit_reason?: unknown;
  summary?: unknown;
  signals?: unknown;
  call_script?: unknown;
};

// Anthropic's tool-use path hands back an already-parsed object (no raw-text
// JSON.parse step exists in this call), so the failure modes worth guarding
// against are: the model not invoking the tool at all, or invoking it with a
// shape that fails validation. Either one used to fall through to
// FALLBACK_INSIGHTS silently (leadScore 5) with no log line, which is the
// worst outcome on an otherwise-hot lead. We now retry the call once and log
// loudly on every failure so a bad extraction is visible, not silent.
function extractToolInput(result: Anthropic.Message): ParsedToolInput | null {
  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return null;

  const input = toolUse.input as ParsedToolInput;
  const hasValidScore =
    typeof input.lead_score === "number" &&
    Number.isInteger(input.lead_score) &&
    input.lead_score >= 1 &&
    input.lead_score <= 10;
  const hasValidCallScript =
    typeof (input.call_script as { opener?: unknown } | undefined)?.opener === "string" &&
    Array.isArray((input.call_script as { talking_points?: unknown } | undefined)?.talking_points);

  if (!hasValidScore || !hasValidCallScript) return null;

  return input;
}

export async function extractInterviewInsights(
  messages: InterviewMessage[],
  companyProfile: CompanyProfile | null = null
): Promise<InterviewInsights> {
  const anthropic = getAnthropicClient();
  const system = buildExtractionSystemPrompt(companyProfile);
  const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: transcriptToText(messages) }],
    tools: [INSIGHTS_TOOL],
    tool_choice: { type: "tool", name: "record_interview_insights" },
  };

  let input: ParsedToolInput | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await anthropic.messages.create(requestParams);
    input = extractToolInput(result);
    if (input) break;
    console.error(
      `[extractInterviewInsights] attempt ${attempt} failed to produce a valid record_interview_insights call; ` +
        `${attempt < 2 ? "retrying once" : "falling back to defaults (lead_score=5) after retry"}`
    );
  }

  if (!input) return FALLBACK_INSIGHTS;

  const painPoints = Array.isArray(input.pain_points)
    ? input.pain_points.filter((p): p is string => typeof p === "string")
    : FALLBACK_INSIGHTS.painPoints;

  // Validated in extractToolInput.
  const leadScore = input.lead_score as number;

  const fitReason = typeof input.fit_reason === "string" ? input.fit_reason : FALLBACK_INSIGHTS.fitReason;

  const summary = typeof input.summary === "string" ? input.summary : FALLBACK_INSIGHTS.summary;

  const normalizeSignal = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const rawSignals = input.signals as
    | {
        economic_buyer?: unknown;
        decision_criteria?: unknown;
        decision_process?: unknown;
        metrics?: unknown;
        champion?: unknown;
      }
    | undefined;

  const signals: Signals = {
    economicBuyer: normalizeSignal(rawSignals?.economic_buyer),
    decisionCriteria: normalizeSignal(rawSignals?.decision_criteria),
    decisionProcess: normalizeSignal(rawSignals?.decision_process),
    metrics: normalizeSignal(rawSignals?.metrics),
    champion: normalizeSignal(rawSignals?.champion),
  };

  // Validated in extractToolInput.
  const rawCallScript = input.call_script as { opener: string; talking_points: unknown[] };
  const callScript: CallScript = {
    opener: rawCallScript.opener,
    talkingPoints: rawCallScript.talking_points.filter((p): p is string => typeof p === "string").slice(0, 3),
  };

  return { painPoints, leadScore, fitReason, summary, callScript, signals };
}
