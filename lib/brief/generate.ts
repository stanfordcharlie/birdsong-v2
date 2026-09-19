import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, modelParams } from "@/lib/interview/anthropic";
import {
  GUIDE_SIGNALS,
  MAX_THEMES,
  MIN_THEMES,
  type GuideSignal,
  type GuideTheme,
  type StructuredGuide,
} from "@/lib/studies/guide";
import type { QuestionGuideProfileContext } from "@/lib/studies/question-guide";
import { slugifyCustomFieldKey } from "@/lib/studies/respondent-fields";
import { QUESTION_RULES } from "./rules";
import type { ExtractedBrief } from "./types";

/**
 * A draft call that produced nothing usable. Carries what the model actually
 * returned (stop reason, block types, token count, how many themes parsed)
 * so the route's failure log says why, instead of only the generic message
 * the admin sees.
 */
export class GuideDraftError extends Error {
  readonly details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = "GuideDraftError";
    this.details = details;
  }
}

/** One draft of a theme and what review said about it. */
export type ThemeDraftAttempt = {
  /** 1 is the initial draft; redrafts count up from 2. */
  attempt: number;
  theme: GuideTheme;
  /** The reviewer's flag lines, verbatim. Empty only if it cleared. */
  critique: string[];
};

const GUIDE_TOOL: Anthropic.Tool = {
  name: "record_guide",
  description: "Record the drafted research guide.",
  input_schema: {
    type: "object",
    properties: {
      themes: {
        type: "array",
        minItems: MIN_THEMES,
        maxItems: MAX_THEMES,
        items: {
          type: "object",
          properties: {
            theme: { type: "string", description: "Short internal label, 2 to 5 words." },
            research_intent: {
              type: "string",
              description: "One line: what this theme is genuinely trying to learn.",
            },
            signal: { type: "string", enum: [...GUIDE_SIGNALS] },
            opening_question: {
              type: "string",
              description: "The question the moderator leads with. Open-ended, story-shaped.",
            },
            probes: {
              type: "array",
              minItems: 2,
              maxItems: 3,
              items: { type: "string" },
              description: "Follow-ups, ordered broad to concrete.",
            },
            quantification_probe: {
              type: "string",
              description: "One follow-up that produces a number.",
            },
          },
          required: [
            "theme",
            "research_intent",
            "signal",
            "opening_question",
            "probes",
            "quantification_probe",
          ],
        },
      },
      recommended_title: {
        type: "string",
        description: "Study title as respondents will see it.",
      },
      recommended_topic: {
        type: "string",
        description: "Internal topic line summarizing what the interview is about.",
      },
      recommended_custom_fields: {
        type: "array",
        maxItems: 3,
        items: { type: "string" },
        description: "Labels of extra fields worth collecting at intake, or an empty array.",
      },
    },
    required: ["themes", "recommended_title", "recommended_topic", "recommended_custom_fields"],
  },
};

function briefToText(brief: ExtractedBrief): string {
  return [
    `Who they sell to, roles: ${brief.icpRoles || "not stated"}`,
    `Company profile of those buyers: ${brief.icpCompanyProfile || "not stated"}`,
    `Industry: ${brief.icpIndustry || "not stated"}`,
    `What they want to learn: ${brief.researchQuestion || "not stated"}`,
    `What the study is publicly about: ${brief.publicTopic || "not stated"}`,
    `Sponsor: ${brief.sponsorName || "not stated"}`,
    `How they want to be credited: ${brief.sponsorCredit || "not stated"}`,
  ].join("\n");
}

function profileToText(profile: QuestionGuideProfileContext | null): string {
  const lines = [
    profile?.whatWeSell ? `They sell: ${profile.whatWeSell}` : null,
    profile?.targetIcp ? `Their usual target customer: ${profile.targetIcp}` : null,
    profile?.valueProp ? `Their value proposition: ${profile.valueProp}` : null,
  ].filter(Boolean);

  if (lines.length === 0) return "No company profile on file.";

  return `${lines.join("\n")}

Use this ONLY to decide which parts of the respondent's work are worth the limited questions. It is the list of things you must never name in a question, not a list of things to ask about by name.`;
}

function buildSystemPrompt(): string {
  return `You draft the research guide that drives a one-on-one AI-moderated research interview with a business professional. The interview is real research. It is not a sales call and must never read as one.

You will produce ${MIN_THEMES} to ${MAX_THEMES} themes. Each theme is one line of inquiry with an opening question, two or three probes ordered broad to concrete, and exactly one follow-up that produces a number.

The signal field says which qualification signal the theme surfaces, one of: pain (friction in how the work actually runs), impact (what a failure or delay affects downstream), urgency (what is forcing a change now), ownership (who decides and who is accountable), context (how the work is structured today). Spread these across the themes rather than repeating one.

research_intent is internal. It is shown to the person commissioning the study and explains why the theme is there. One line, plain, no hedging.

Every question you write in opening_question, probes and quantification_probe is respondent-facing text. These rules govern all of them, without exception:

${QUESTION_RULES}

Across the whole guide:
- Exactly one theme, at minimum, must do workaround archaeology: what they did manually or repeatedly in a recent period.
- Exactly one theme, at minimum, must follow a consequence chain outward from a specific event.
- Themes must not overlap. Two themes asking the same thing in different words is a wasted interview.
- Order the themes the way the conversation should run: context first, consequences and urgency later, ownership last.

recommended_title is what a respondent sees at the top of the study page. Neutral, specific, research framed. Never the word survey, never the sponsor's name, never a product category.

recommended_topic is internal. One line describing what the interview covers.

recommended_custom_fields are labels of up to three extra facts worth collecting on the intake form, beyond name and email, that would make the responses more useful to segment. Things like "Team size" or "Fleet size". Return an empty array if nothing is genuinely worth asking for. Never ask for anything sensitive and never ask for anything the interview itself will cover.

Call record_guide exactly once.`;
}

function coerceTheme(raw: unknown): GuideTheme | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const theme = typeof value.theme === "string" ? value.theme.trim() : "";
  const opening = typeof value.opening_question === "string" ? value.opening_question.trim() : "";
  if (!theme || !opening) return null;

  const signal = (GUIDE_SIGNALS as readonly string[]).includes(value.signal as string)
    ? (value.signal as GuideSignal)
    : "context";

  return {
    theme,
    research_intent:
      typeof value.research_intent === "string" ? value.research_intent.trim() : "",
    signal,
    opening_question: opening,
    probes: Array.isArray(value.probes)
      ? value.probes.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
      : [],
    quantification_probe:
      typeof value.quantification_probe === "string" ? value.quantification_probe.trim() : "",
  };
}

type GuideToolCall = {
  input: Record<string, unknown> | null;
  /** What the model reported about its own reply, for the failure log. */
  details: {
    stopReason: string | null;
    blockTypes: string[];
    outputTokens: number | null;
    modelRequestId: string | null;
    /** Any text the model sent instead of (or beside) the tool call, capped. */
    rawText: string;
  };
};

const RAW_TEXT_CAP = 2000;

async function callGuideTool(system: string, userContent: string): Promise<GuideToolCall> {
  const anthropic = getAnthropicClient();
  const result = await anthropic.messages.create({
        // Thinking may not be enabled when tool_choice forces a tool, so this is
    // all output: a full guide is well under 8192 tokens.
    ...modelParams({ maxTokens: 8192, thinking: "off" }),
        system,
    messages: [{ role: "user", content: userContent }],
    tools: [GUIDE_TOOL],
    tool_choice: { type: "tool", name: "record_guide" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  return {
    input: toolUse ? (toolUse.input as Record<string, unknown>) : null,
    details: {
      stopReason: result.stop_reason ?? null,
      blockTypes: result.content.map((block) => block.type),
      outputTokens: result.usage?.output_tokens ?? null,
      modelRequestId: (result as { _request_id?: string })._request_id ?? null,
      rawText: result.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .slice(0, RAW_TEXT_CAP),
    },
  };
}

/** Draft the whole guide from the brief. Pre-critic. */
export async function generateGuide({
  brief,
  profile,
}: {
  brief: ExtractedBrief;
  profile: QuestionGuideProfileContext | null;
}): Promise<StructuredGuide> {
  const { input, details } = await callGuideTool(
    buildSystemPrompt(),
    `The research brief, collected from the sponsor:

${briefToText(brief)}

What the sponsoring company does:

${profileToText(profile)}`
  );

  if (!input) {
    throw new GuideDraftError("Failed to draft a research guide", { ...details, reason: "no_tool_use" });
  }

  const rawThemes = Array.isArray(input.themes) ? input.themes : [];
  const themes = rawThemes.map(coerceTheme).filter((t): t is GuideTheme => t !== null);

  if (themes.length === 0) {
    throw new GuideDraftError("Failed to draft a research guide", {
      ...details,
      reason: "no_themes",
      rawThemes: rawThemes.length,
    });
  }

  const fieldLabels = Array.isArray(input.recommended_custom_fields)
    ? input.recommended_custom_fields
        .filter((label): label is string => typeof label === "string" && label.trim().length > 0)
        .slice(0, 3)
    : [];

  return {
    themes,
    recommended_title:
      typeof input.recommended_title === "string" ? input.recommended_title.trim() : "",
    recommended_topic:
      typeof input.recommended_topic === "string" ? input.recommended_topic.trim() : "",
    recommended_custom_fields: fieldLabels.map((label) => ({
      key: slugifyCustomFieldKey(label.trim()),
      label: label.trim(),
    })),
  };
}

function themeToText(theme: GuideTheme): string {
  return [
    `Label: ${theme.theme}`,
    `Intent: ${theme.research_intent}`,
    `Signal: ${theme.signal}`,
    `Opening: ${theme.opening_question}`,
    `Probes: ${theme.probes.join(" / ")}`,
    `Number: ${theme.quantification_probe}`,
  ].join("\n");
}

/**
 * Redraft one theme. Used by the critic's retry loop (with the history of
 * every draft so far and what review said about each) and by the review
 * step's per-theme redraft button (with the theme's current flags if it has
 * any, otherwise just a request for a different angle).
 *
 * The critique goes in verbatim: a redraft that does not know the objection
 * cannot clear it. Earlier attempts go in too, so fixing this draft's
 * problem does not bring back one an earlier draft already had.
 *
 * The other themes go in as context so a redraft cannot land on top of a
 * line of inquiry the guide already covers.
 */
export async function regenerateTheme({
  brief,
  profile,
  guide,
  index,
  failures,
  history,
}: {
  brief: ExtractedBrief;
  profile: QuestionGuideProfileContext | null;
  guide: StructuredGuide;
  index: number;
  /** The reviewer's flag lines for the current draft, verbatim. */
  failures?: string[];
  /**
   * Every draft so far, oldest first, the last being the one to replace.
   * When given, it supplies both the draft being replaced and, if
   * `failures` is absent, the critique to fix.
   */
  history?: ThemeDraftAttempt[];
}): Promise<GuideTheme> {
  const attempts = history ?? [];
  const latest = attempts[attempts.length - 1];
  const target = latest?.theme ?? guide.themes[index];
  if (!target) throw new Error("No such theme");

  const critique = failures ?? latest?.critique ?? [];
  const earlier = attempts.slice(0, -1);

  const others = guide.themes
    .filter((_, i) => i !== index)
    .map((t) => `- ${t.theme}: ${t.research_intent}`)
    .join("\n");

  const failureSection =
    critique.length > 0
      ? `This draft of the theme FAILED review. Every one of these must be fixed, and fixing one must not introduce another:
${critique.map((f) => `- ${f}`).join("\n")}`
      : `Draft a different angle on the same territory. Keep the signal (${target.signal}) but do not reuse the questions below.`;

  const historySection =
    earlier.length > 0
      ? `

Earlier drafts of this same theme, which ALSO failed review. Do not reuse their questions and do not reintroduce the problems named under each:

${earlier
  .map(
    (a) => `Attempt ${a.attempt}:
${themeToText(a.theme)}
Review said:
${a.critique.map((f) => `- ${f}`).join("\n")}`
  )
  .join("\n\n")}`
      : "";

  const { input, details } = await callGuideTool(
    `${buildSystemPrompt()}

You are redrafting ONE theme inside an existing guide. Return a themes array containing exactly one theme, the replacement. recommended_title, recommended_topic and recommended_custom_fields are ignored on this call, so send back short placeholder values for them.`,
    `The research brief, collected from the sponsor:

${briefToText(brief)}

What the sponsoring company does:

${profileToText(profile)}

The other themes in the guide, which the replacement must NOT duplicate:
${others || "none"}

The theme being replaced${earlier.length > 0 ? ` (attempt ${latest.attempt})` : ""}:
${themeToText(target)}

${failureSection}${historySection}`
  );

  const raw = Array.isArray(input?.themes) ? input?.themes[0] : null;
  const redrafted = coerceTheme(raw);
  if (!redrafted) {
    throw new GuideDraftError("Failed to redraft the theme", {
      ...details,
      reason: input ? "no_parseable_theme" : "no_tool_use",
      themeIndex: index,
    });
  }
  return redrafted;
}
