import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import {
  GUIDE_SIGNALS,
  MAX_THEMES,
  MIN_THEMES,
  type GuideSignal,
  type GuideTheme,
  type StructuredGuide,
} from "@/lib/surveys/guide";
import type { QuestionGuideProfileContext } from "@/lib/surveys/question-guide";
import { slugifyCustomFieldKey } from "@/lib/surveys/respondent-fields";
import { QUESTION_RULES } from "./rules";
import type { ExtractedBrief } from "./types";

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

async function callGuideTool(
  system: string,
  userContent: string
): Promise<Record<string, unknown> | null> {
  const anthropic = getAnthropicClient();
  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userContent }],
    tools: [GUIDE_TOOL],
    tool_choice: { type: "tool", name: "record_guide" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  return toolUse ? (toolUse.input as Record<string, unknown>) : null;
}

/** Draft the whole guide from the brief. Pre-critic. */
export async function generateGuide({
  brief,
  profile,
}: {
  brief: ExtractedBrief;
  profile: QuestionGuideProfileContext | null;
}): Promise<StructuredGuide> {
  const input = await callGuideTool(
    buildSystemPrompt(),
    `The research brief, collected from the sponsor:

${briefToText(brief)}

What the sponsoring company does:

${profileToText(profile)}`
  );

  if (!input) throw new Error("Failed to draft a research guide");

  const themes = Array.isArray(input.themes)
    ? input.themes.map(coerceTheme).filter((t): t is GuideTheme => t !== null)
    : [];

  if (themes.length === 0) throw new Error("Failed to draft a research guide");

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

/**
 * Redraft one theme. Used both by the critic's regeneration step (with the
 * failures it found) and by the review step's per-theme regenerate button
 * (with no failures, just a request for a different angle).
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
}: {
  brief: ExtractedBrief;
  profile: QuestionGuideProfileContext | null;
  guide: StructuredGuide;
  index: number;
  failures?: string[];
}): Promise<GuideTheme> {
  const target = guide.themes[index];
  if (!target) throw new Error("No such theme");

  const others = guide.themes
    .filter((_, i) => i !== index)
    .map((t) => `- ${t.theme}: ${t.research_intent}`)
    .join("\n");

  const failureSection =
    failures && failures.length > 0
      ? `This draft of the theme FAILED review. Every one of these must be fixed, and fixing one must not introduce another:
${failures.map((f) => `- ${f}`).join("\n")}`
      : `Draft a different angle on the same territory. Keep the signal (${target.signal}) but do not reuse the questions below.`;

  const input = await callGuideTool(
    `${buildSystemPrompt()}

You are redrafting ONE theme inside an existing guide. Return a themes array containing exactly one theme, the replacement. recommended_title, recommended_topic and recommended_custom_fields are ignored on this call, so send back short placeholder values for them.`,
    `The research brief, collected from the sponsor:

${briefToText(brief)}

What the sponsoring company does:

${profileToText(profile)}

The other themes in the guide, which the replacement must NOT duplicate:
${others || "none"}

The theme being replaced:
Label: ${target.theme}
Intent: ${target.research_intent}
Signal: ${target.signal}
Opening: ${target.opening_question}
Probes: ${target.probes.join(" / ")}
Number: ${target.quantification_probe}

${failureSection}`
  );

  const raw = Array.isArray(input?.themes) ? input?.themes[0] : null;
  const redrafted = coerceTheme(raw);
  if (!redrafted) throw new Error("Failed to redraft the theme");
  return redrafted;
}
