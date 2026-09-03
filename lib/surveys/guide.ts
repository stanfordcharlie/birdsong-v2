/**
 * The structured research guide.
 *
 * This is the authored artifact: four to six themes, each with the intent
 * behind it and the questions the moderator leads with. It is stored on
 * surveys.guide_structured.
 *
 * surveys.question_guide keeps holding a TEXT rendering derived from this
 * (see renderGuideToText). lib/interview-prompt.ts reads that text column
 * and nothing else, unchanged, so the interview runtime never learns about
 * this shape and pre-existing free-text guides keep working untouched.
 */

// What a theme is trying to surface about the respondent. Internal only:
// these words are shown to the admin in the review step and written into
// the derived brief, never to a respondent.
export const GUIDE_SIGNALS = ["pain", "impact", "urgency", "ownership", "context"] as const;
export type GuideSignal = (typeof GUIDE_SIGNALS)[number];

export const SIGNAL_LABELS: Record<GuideSignal, string> = {
  pain: "Friction",
  impact: "Impact",
  urgency: "Urgency",
  ownership: "Ownership",
  context: "Context",
};

export type GuideTheme = {
  /** Short internal label for the theme. */
  theme: string;
  /** One line: what this theme is genuinely trying to learn. */
  research_intent: string;
  signal: GuideSignal;
  /** The question the moderator leads with. Open-ended, story-shaped. */
  opening_question: string;
  /** Two or three follow-ups, ordered broad to concrete. */
  probes: string[];
  /** One follow-up that produces a number. */
  quantification_probe: string;
  /**
   * Rule violations the critic pass could not clear in one regeneration.
   * Present only on a theme that shipped flagged, so the review step can
   * show the admin exactly what is wrong instead of hiding it.
   */
  flags?: string[];
};

export type RecommendedCustomField = {
  key: string;
  label: string;
};

export type StructuredGuide = {
  themes: GuideTheme[];
  /** Study title as respondents will see it. */
  recommended_title: string;
  /** Internal topic line driving the interview. */
  recommended_topic: string;
  recommended_custom_fields: RecommendedCustomField[];
};

export const MIN_THEMES = 4;
export const MAX_THEMES = 6;

/** Every respondent-facing string in one theme, in the order it is asked. */
export function themeQuestions(theme: GuideTheme): string[] {
  return [theme.opening_question, ...theme.probes, theme.quantification_probe].filter(
    (q) => typeof q === "string" && q.trim().length > 0
  );
}

export function isStructuredGuide(value: unknown): value is StructuredGuide {
  if (typeof value !== "object" || value === null) return false;
  const guide = value as StructuredGuide;
  return Array.isArray(guide.themes) && guide.themes.every(isGuideTheme);
}

function isGuideTheme(value: unknown): value is GuideTheme {
  if (typeof value !== "object" || value === null) return false;
  const theme = value as GuideTheme;
  return (
    typeof theme.theme === "string" &&
    typeof theme.research_intent === "string" &&
    typeof theme.opening_question === "string" &&
    typeof theme.quantification_probe === "string" &&
    Array.isArray(theme.probes)
  );
}

/**
 * The derived text rendering written to surveys.question_guide.
 *
 * Written to be read correctly by the brief section of
 * lib/interview-prompt.ts as it exists today, which frames the guide as
 * "notes and angles to explore, not ready-made questions" and tells the
 * moderator to write its own phrasing in the moment. So each theme is
 * rendered as direction first (what to learn, what to surface) with the
 * drafted questions given as the framing to adapt, not as a script. The
 * research value of these questions is in what they anchor on, recency and
 * a specific instance, which survives the moderator rephrasing them.
 *
 * No em dashes, and nothing here names the sponsor or a product category:
 * both are enforced upstream at generation time.
 */
export function renderGuideToText(guide: StructuredGuide): string {
  return guide.themes
    .map((theme, i) => {
      const lines = [
        `${i + 1}. ${theme.theme}`,
        `   What to learn: ${theme.research_intent}`,
        `   What to surface: ${SIGNAL_LABELS[theme.signal] ?? theme.signal}`,
        `   Lead with, in your own words: ${theme.opening_question}`,
      ];
      if (theme.probes.length > 0) {
        lines.push(`   Then go concrete: ${theme.probes.join(" / ")}`);
      }
      if (theme.quantification_probe.trim()) {
        lines.push(`   Get a number: ${theme.quantification_probe}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}
