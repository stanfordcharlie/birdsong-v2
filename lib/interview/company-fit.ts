import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, INTERVIEW_MODEL } from "./anthropic";

// Company fit-scoring agent. This is a SEPARATE question from the existing
// respondent lead_score (lib/interview/extract.ts): lead_score answers "did
// this person show real pain?", scored from the transcript. This agent
// answers "is this company worth calling?" — it researches the RESPONDENT'S
// company on the open web and scores it against the SPONSOR'S ICP. It never
// reads the transcript and never touches lead_score/pain_points/call_script.

// The sponsor is the survey owner. These come from their company profile.
export type SponsorProfile = {
  industry: string | null;
  whatWeSell: string | null;
  targetIcp: string | null;
  valueProp: string | null;
};

// The company to research: the respondent's employer, identified by the name
// they gave (or one derived from their work-email domain) and the domain.
export type RespondentCompany = {
  name: string | null;
  domain: string | null;
};

// high/medium/low describe a run that completed. "unavailable" is a distinct
// terminal state meaning the agent errored, so a row is never ambiguous
// between "not yet run" (null in the DB) and "ran but failed".
export type FitConfidence = "high" | "medium" | "low" | "unavailable";

export type CompanyFit = {
  fitScore: number | null; // 1-10, null only when unavailable
  fitReasoning: string;
  fitConfidence: FitConfidence;
};

const FIT_UNAVAILABLE: CompanyFit = {
  fitScore: null,
  fitReasoning: "",
  fitConfidence: "unavailable",
};

// Bounds the web-search cost per run.
const MAX_WEB_SEARCHES = 5;

export function buildFitSystemPrompt(): string {
  return `You are a B2B sales research analyst. Your job is to research ONE company (the "respondent's company") using web search, then judge how well it fits the ideal customer profile (ICP) of a different company (the "sponsor") that wants to sell to it. You are answering exactly one question: is this company worth a sales call, based on what the company IS and DOES. You are NOT judging anything a person said in an interview.

You will be given the respondent's company name and/or work-email domain, and the sponsor's profile (what they sell, their ICP, their target customer traits, their value proposition).

Do this:
1. Use web_search to find what the respondent's company actually does and its approximate scale. Use whatever scale signal fits its industry: annual revenue, employee count, number of locations, population or customers served, funding raised, and so on. Prefer primary or reputable sources.
2. Compare what you found against the sponsor's ICP. Weigh industry match, size/scale match, and whether the sponsor's value proposition plausibly applies to a company like this.
3. Call the record_company_fit tool exactly once with your assessment.

Scoring (fit_score, 1-10). This is company-vs-ICP fit, NOT whether anyone expressed pain:
- 9-10: strong, well-evidenced match on industry AND scale; the sponsor's offering clearly applies.
- 7-8: good match on the main ICP dimensions, with minor gaps or a single unknown.
- 5-6: partial or unclear match, or the evidence is mixed.
- 3-4: likely a weak fit (wrong industry, far outside the target size, or the offering does not apply).
- 1-2: clearly not a fit.

Evidence and honesty rules. Follow these exactly:
- fit_reasoning must be one to two sentences, specific and grounded in what your search actually found. Name the concrete signal you used (the industry, the size figure, the segment). Never generic filler that could apply to any company.
- NEVER fabricate a specific number (a revenue figure, an employee count, a customer count) that your search did not actually surface. If you do not have a figure, do not invent one; reason from what you do have.
- Set fit_confidence to one of:
  - high: you found clear, reliable information about what the company is and its scale.
  - medium: you found some information, but a key ICP dimension (industry or size) is partly unverified.
  - low: search turned up little or nothing reliable about this specific company.
- When fit_confidence is low, your fit_score must reflect that real uncertainty: lean toward the middle (around 5) rather than a confident-sounding high or low number built on thin evidence. A low-confidence 9 or a low-confidence 2 is wrong. A low-confidence 5 is honest.`;
}

export function buildFitUserMessage(company: RespondentCompany, sponsor: SponsorProfile): string {
  const line = (label: string, value: string | null) => `- ${label}: ${value?.trim() ? value.trim() : "(not provided)"}`;
  return `Respondent's company to research:
${line("Name", company.name)}
${line("Work-email domain", company.domain)}

Sponsor (the company that wants to sell to them):
${line("What they sell", sponsor.whatWeSell)}
${line("Their industry", sponsor.industry)}
${line("Ideal customer profile / target customers", sponsor.targetIcp)}
${line("Value proposition", sponsor.valueProp)}

Research the respondent's company and record how well it fits this sponsor's ICP.`;
}

const RECORD_FIT_TOOL: Anthropic.Tool = {
  name: "record_company_fit",
  description:
    "Record the company fit assessment: how well the researched company matches the sponsor's ideal customer profile.",
  input_schema: {
    type: "object",
    properties: {
      fit_score: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description:
          "Company-vs-ICP fit from 1 to 10 per the rubric. If confidence is low, lean toward the middle (around 5).",
      },
      fit_reasoning: {
        type: "string",
        description:
          "One to two sentences, specific and grounded in what the search actually found. Name the concrete signal (industry, size figure, segment). No generic filler. No fabricated numbers.",
      },
      fit_confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "high = clear reliable info found; medium = some info, a key dimension unverified; low = little or nothing reliable found.",
      },
    },
    required: ["fit_score", "fit_reasoning", "fit_confidence"],
  },
};

const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: MAX_WEB_SEARCHES,
};

function extractFit(message: Anthropic.Message): CompanyFit | null {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "record_company_fit"
  );
  if (!toolUse) return null;

  const input = toolUse.input as { fit_score?: unknown; fit_reasoning?: unknown; fit_confidence?: unknown };
  const scoreOk =
    typeof input.fit_score === "number" &&
    Number.isInteger(input.fit_score) &&
    input.fit_score >= 1 &&
    input.fit_score <= 10;
  const confidence = input.fit_confidence;
  const confOk = confidence === "high" || confidence === "medium" || confidence === "low";
  if (!scoreOk || !confOk) return null;

  const reasoning = typeof input.fit_reasoning === "string" ? input.fit_reasoning.trim() : "";
  return { fitScore: input.fit_score as number, fitReasoning: reasoning, fitConfidence: confidence };
}

// Researches the company and returns a fit assessment. Never throws: any
// failure (web search unavailable, model error, no structured output after a
// retry) resolves to the "unavailable" terminal state, logged loudly.
export async function scoreCompanyFit(
  company: RespondentCompany,
  sponsor: SponsorProfile
): Promise<CompanyFit> {
  // Nothing to search on. This is an honest low-confidence outcome, not an
  // error: we ran, but had no identifier to research, so the score is the
  // uncertainty midpoint per the rubric.
  if (!company.name?.trim() && !company.domain?.trim()) {
    return {
      fitScore: 5,
      fitReasoning: "No company name or work-email domain was available to research this respondent's employer.",
      fitConfidence: "low",
    };
  }

  try {
    const anthropic = getAnthropicClient();
    const system = buildFitSystemPrompt();
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildFitUserMessage(company, sponsor) },
    ];

    // Turn 1: web_search (server-executed within this call) plus the record
    // tool, chosen freely — the model searches, then records.
    const first = await anthropic.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 1500,
      system,
      messages,
      tools: [WEB_SEARCH_TOOL, RECORD_FIT_TOOL],
    });

    let fit = extractFit(first);
    if (fit) return fit;

    // The model researched but ended its turn without the structured call.
    // Continue the same conversation and force the record tool now, so the
    // reasoning it already did still produces an answer.
    console.error("[scoreCompanyFit] first turn produced no record_company_fit call; forcing the tool");
    messages.push({ role: "assistant", content: first.content });
    messages.push({
      role: "user",
      content: "Record your assessment now by calling record_company_fit exactly once.",
    });
    const second = await anthropic.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 512,
      system,
      messages,
      tools: [RECORD_FIT_TOOL],
      tool_choice: { type: "tool", name: "record_company_fit" },
    });

    fit = extractFit(second);
    if (fit) return fit;

    console.error("[scoreCompanyFit] no valid record_company_fit after forcing the tool; marking unavailable");
    return FIT_UNAVAILABLE;
  } catch (err) {
    console.error("[scoreCompanyFit] agent call failed; marking unavailable:", err);
    return FIT_UNAVAILABLE;
  }
}

// Fire-and-forget runner: researches, then persists the result to the
// response row. Meant to be handed to waitUntil() from the completion path so
// it never blocks the response, email, or Slack. Failures are contained and
// always resolve the row to a definite state — a successful score, or the
// "unavailable" marker — never left null (which means "not yet run").
export async function runCompanyFitScoring(params: {
  responseId: string;
  // The survey owner = the sponsor whose ICP we score against.
  sponsorUserId: string;
  company: RespondentCompany;
}): Promise<void> {
  const supabase = createAdminClient();
  try {
    // Cheap guard for the window between deploying this code and applying the
    // response_company_fit migration: if the columns don't exist yet, probing
    // one errors. Bail before spending on web search, so nothing is wasted and
    // nothing breaks until the migration lands.
    const probe = await supabase.from("responses").select("fit_confidence").limit(1);
    if (probe.error) {
      console.warn(
        `[companyFit] fit columns not present yet (migration not applied?); skipping response_id=${params.responseId}: ${probe.error.message}`
      );
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("industry, what_we_sell, target_icp, value_prop")
      .eq("user_id", params.sponsorUserId)
      .maybeSingle();

    const sponsor: SponsorProfile = {
      industry: profile?.industry ?? null,
      whatWeSell: profile?.what_we_sell ?? null,
      targetIcp: profile?.target_icp ?? null,
      valueProp: profile?.value_prop ?? null,
    };

    const fit = await scoreCompanyFit(params.company, sponsor);

    const { error } = await supabase
      .from("responses")
      .update({
        fit_score: fit.fitScore,
        fit_reasoning: fit.fitReasoning || null,
        fit_confidence: fit.fitConfidence,
      })
      .eq("id", params.responseId);
    if (error) throw error;

    console.log(
      `[companyFit] response_id=${params.responseId} fit_score=${fit.fitScore ?? "null"} confidence=${fit.fitConfidence}`
    );
  } catch (err) {
    console.error(`[companyFit] FAILED for response_id=${params.responseId}:`, err);
    // Persist the failure as a distinct terminal state so the row is never
    // stuck looking like it was never scored.
    try {
      await supabase
        .from("responses")
        .update({ fit_score: null, fit_reasoning: null, fit_confidence: "unavailable" })
        .eq("id", params.responseId);
    } catch (writeErr) {
      console.error(
        `[companyFit] also failed to persist the unavailable state for response_id=${params.responseId}:`,
        writeErr
      );
    }
  }
}
