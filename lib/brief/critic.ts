import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { GuideTheme, StructuredGuide } from "@/lib/surveys/guide";
import type { QuestionGuideProfileContext } from "@/lib/surveys/question-guide";
import { regenerateTheme } from "./generate";
import { BANNED_QUESTION_TERMS, QUESTION_RULES, YES_NO_OPENERS } from "./rules";
import type { ExtractedBrief } from "./types";

export type QuestionSlot = "opening" | "probe" | "quantification";

export type QuestionVerdict = {
  /** Stable address, e.g. "t2.probe1". Also what the model answers against. */
  id: string;
  themeIndex: number;
  themeLabel: string;
  slot: QuestionSlot;
  question: string;
  pass: boolean;
  /** One line per rule broken. Empty when pass is true. */
  failures: string[];
};

export type CriticReport = {
  /** Verdicts on the first draft, before any regeneration. */
  initial: QuestionVerdict[];
  /** Verdicts on what actually shipped. */
  final: QuestionVerdict[];
  /** Themes that were redrafted, and why. */
  regenerated: { themeIndex: number; themeLabel: string; reasons: string[] }[];
  /** Themes still failing after one regeneration. Surfaced, never hidden. */
  unresolved: { themeIndex: number; themeLabel: string; reasons: string[] }[];
};

function questionId(themeIndex: number, slot: QuestionSlot, slotIndex = 0): string {
  return slot === "probe" ? `t${themeIndex}.probe${slotIndex + 1}` : `t${themeIndex}.${slot}`;
}

type AddressedQuestion = {
  id: string;
  themeIndex: number;
  themeLabel: string;
  slot: QuestionSlot;
  question: string;
};

function addressQuestions(themes: GuideTheme[]): AddressedQuestion[] {
  const out: AddressedQuestion[] = [];
  themes.forEach((theme, themeIndex) => {
    const push = (slot: QuestionSlot, question: string, slotIndex = 0) => {
      out.push({
        id: questionId(themeIndex, slot, slotIndex),
        themeIndex,
        themeLabel: theme.theme,
        slot,
        question,
      });
    };
    push("opening", theme.opening_question);
    theme.probes.forEach((probe, i) => push("probe", probe, i));
    if (theme.quantification_probe.trim()) push("quantification", theme.quantification_probe);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Layer one: lexical. Cheap, deterministic, and runs before any model call,
// because a banned word or an em dash is not a judgment call.
// ---------------------------------------------------------------------------

const RECENCY_MARKERS = [
  "last time",
  "last week",
  "last month",
  "last quarter",
  "last year",
  "most recent",
  "recently",
  "recent",
  "this week",
  "this month",
  "walk me through",
  "the last ",
  "yesterday",
  "past week",
  "past month",
  "past few",
  "since ",
];

const NUMERIC_MARKERS = [
  "how many",
  "how often",
  "how long",
  "how much",
  "how frequently",
  "number of",
  "how large",
];

export function lexicalFailures(question: string, slot: QuestionSlot): string[] {
  const failures: string[] = [];
  const text = question.trim();
  const lower = text.toLowerCase();

  if (text.includes("—") || text.includes("–")) {
    failures.push("Contains an em dash or en dash.");
  }

  for (const term of BANNED_QUESTION_TERMS) {
    if (lower.includes(term)) {
      failures.push(`Uses banned vocabulary: "${term}".`);
    }
  }

  const firstWord = lower.replace(/^[^a-z]+/, "").split(/\s+/)[0] ?? "";
  if ((YES_NO_OPENERS as readonly string[]).includes(firstWord)) {
    failures.push(`Opens with "${firstWord}", which makes it answerable yes or no.`);
  }

  // Two question marks, or one that is not the last character, means two
  // questions were packed into one string.
  const marks = (text.match(/\?/g) ?? []).length;
  if (marks > 1) {
    failures.push("Compound question: more than one question mark.");
  } else if (marks === 1 && !text.endsWith("?")) {
    failures.push("Compound question: text continues after the question mark.");
  }
  // A second question tacked onto the end as a fragment: "..., and how?",
  // "..., and where?". Deliberately anchored to the end of the string. An
  // earlier version flagged any interrogative word following a comma or an
  // "and" anywhere in the sentence, which failed ordinary single questions
  // like "For that specific call, how many people did you contact?" and
  // "how long was the gap between when the call came in and when the
  // technician arrived?" three times in one verification run.
  if (/[,\s](and|or)\s+(what|how|who|when|where|why|which)\s*\??$/i.test(text)) {
    if (!failures.some((f) => f.startsWith("Compound"))) {
      failures.push("Reads as two questions joined into one.");
    }
  }

  if (slot === "opening") {
    if (!RECENCY_MARKERS.some((marker) => lower.includes(marker))) {
      failures.push("No recency anchor: does not point at a recent specific instance.");
    }
  }

  if (slot === "quantification" && !NUMERIC_MARKERS.some((marker) => lower.includes(marker))) {
    failures.push("Does not ask for a number.");
  }

  return failures;
}

/** Theme-shaped rules, checked outside the per-question loop. */
export function themeFailures(theme: GuideTheme): string[] {
  const failures: string[] = [];
  if (!theme.quantification_probe.trim()) {
    failures.push("Missing the quantification probe.");
  }
  if (theme.probes.length < 2) {
    failures.push("Fewer than two probes.");
  }
  if (!theme.research_intent.trim()) {
    failures.push("Missing research_intent.");
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Layer two: the model. Only for what a lexical rule cannot see — leading
// framing, a presupposed problem, an abstract question that happens to
// contain a recency word, a solution category named without a banned term.
// ---------------------------------------------------------------------------

const CRITIC_TOOL: Anthropic.Tool = {
  name: "record_verdicts",
  description: "Record one verdict per question.",
  input_schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            pass: { type: "boolean" },
            failures: {
              type: "array",
              items: { type: "string" },
              description:
                "One short line per rule broken, naming the rule and quoting the offending part. Empty when pass is true.",
            },
          },
          required: ["id", "pass", "failures"],
        },
      },
    },
    required: ["verdicts"],
  },
};

const CRITIC_SYSTEM = `You review draft research interview questions against a fixed rule set and return a verdict per question. You are the last check before these questions are put in front of real respondents, so you are looking for reasons to fail a question, not reasons to pass it.

The rules the questions were written against:

${QUESTION_RULES}

Judge each question ONLY on these, and specifically on the ones a word search cannot catch:
- Leading framing. Does the question presuppose an opinion, a preference, or a judgment? Would someone who feels neutral about the topic find it awkward to answer?
- Presupposed problems. Does it assume something is going wrong, is slow, is manual, is inadequate, or needs improving? A question is only fair if someone for whom everything works fine can answer it just as easily.
- Abstract framing. Does it ask about general process or typical behavior rather than one specific recent instance? A recency word pasted onto an abstract question does not make it concrete: "how do you usually handle this recently" is still abstract.
- Named solutions or categories. Does it name a product, a vendor, a tool category, or a class of software or service?
- Hypotheticals. Does it ask what they would do, or what they wish were true, instead of what actually happened?

Do not fail a question for being plain, blunt, or short. Do not fail it for missing a recency anchor if it is a probe or a numeric follow-up, since those hang off an opening question that already carries one. Do not invent rules that are not listed above.

Return exactly one verdict for every id you were given, using that id verbatim. Call record_verdicts exactly once.`;

async function modelVerdicts(
  questions: AddressedQuestion[]
): Promise<Map<string, string[]>> {
  if (questions.length === 0) return new Map();

  const anthropic = getAnthropicClient();
  const listing = questions
    .map((q) => `${q.id} [${q.slot}] ${q.question}`)
    .join("\n");

  const result = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 4096,
    system: CRITIC_SYSTEM,
    messages: [{ role: "user", content: `Questions to review:\n\n${listing}` }],
    tools: [CRITIC_TOOL],
    tool_choice: { type: "tool", name: "record_verdicts" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  const failures = new Map<string, string[]>();
  if (!toolUse) return failures;

  const raw = (toolUse.input as { verdicts?: unknown }).verdicts;
  if (!Array.isArray(raw)) return failures;

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const verdict = entry as { id?: unknown; pass?: unknown; failures?: unknown };
    if (typeof verdict.id !== "string") continue;
    if (verdict.pass === true) continue;
    const reasons = Array.isArray(verdict.failures)
      ? verdict.failures.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      : [];
    failures.set(verdict.id, reasons.length > 0 ? reasons : ["Failed review with no reason given."]);
  }

  return failures;
}

/** One full validation sweep over a guide: lexical, then the model. */
export async function reviewGuide(guide: StructuredGuide): Promise<QuestionVerdict[]> {
  const questions = addressQuestions(guide.themes);
  const modelFailures = await modelVerdicts(questions);

  const verdicts: QuestionVerdict[] = questions.map((q) => {
    const failures = [...lexicalFailures(q.question, q.slot), ...(modelFailures.get(q.id) ?? [])];
    return { ...q, pass: failures.length === 0, failures };
  });

  // Theme-shaped failures attach to that theme's opening question, so a
  // theme missing its numeric follow-up entirely still fails something.
  guide.themes.forEach((theme, themeIndex) => {
    const problems = themeFailures(theme);
    if (problems.length === 0) return;
    const opening = verdicts.find((v) => v.themeIndex === themeIndex && v.slot === "opening");
    if (opening) {
      opening.failures.push(...problems);
      opening.pass = false;
    }
  });

  return verdicts;
}

function failuresByTheme(verdicts: QuestionVerdict[]): Map<number, string[]> {
  const byTheme = new Map<number, string[]>();
  for (const verdict of verdicts) {
    if (verdict.pass) continue;
    const existing = byTheme.get(verdict.themeIndex) ?? [];
    existing.push(...verdict.failures.map((f) => `${verdict.slot}: ${f}`));
    byTheme.set(verdict.themeIndex, existing);
  }
  return byTheme;
}

/**
 * The mandatory pass. Review, redraft every failing theme once, review the
 * redrafts, and keep whichever version is better.
 *
 * A theme that still fails is kept and flagged rather than dropped or
 * silently shipped: the review step renders the flag, and the person
 * commissioning the study decides what to do about it.
 */
export async function runCriticPass({
  brief,
  profile,
  guide,
}: {
  brief: ExtractedBrief;
  profile: QuestionGuideProfileContext | null;
  guide: StructuredGuide;
}): Promise<{ guide: StructuredGuide; report: CriticReport }> {
  const initial = await reviewGuide(guide);

  let current: StructuredGuide = guide;
  let verdicts = initial;
  const regenerated: CriticReport["regenerated"] = [];
  // Every theme gets at most one redraft, which is the contract: fail once
  // and you are rewritten, fail twice and you are shown to the admin rather
  // than shipped quietly.
  const attempted = new Set<number>();

  // Two rounds, because the model half of the review is not deterministic:
  // a theme can pass the first sweep and fail the sweep that runs after its
  // neighbours were redrafted. Without a second round that theme ships
  // flagged having never been given its one redraft, which is the bug this
  // loop replaced.
  for (let round = 0; round < 2; round++) {
    const failing = Array.from(failuresByTheme(verdicts).entries()).filter(
      ([themeIndex]) => !attempted.has(themeIndex)
    );
    if (failing.length === 0) break;

    failing.forEach(([themeIndex]) => attempted.add(themeIndex));

    // Redrafts within a round are independent, so they go out together
    // rather than serially.
    const redrafts = await Promise.all(
      failing.map(async ([themeIndex, reasons]) => {
        try {
          const theme = await regenerateTheme({
            brief,
            profile,
            guide: current,
            index: themeIndex,
            failures: reasons,
          });
          return { themeIndex, reasons, theme };
        } catch {
          return { themeIndex, reasons, theme: null };
        }
      })
    );

    const themes = [...current.themes];
    for (const redraft of redrafts) {
      if (!redraft.theme) continue;
      regenerated.push({
        themeIndex: redraft.themeIndex,
        themeLabel: themes[redraft.themeIndex].theme,
        reasons: redraft.reasons,
      });
      themes[redraft.themeIndex] = redraft.theme;
    }

    current = { ...current, themes };
    verdicts = await reviewGuide(current);
  }

  const stillFailing = failuresByTheme(verdicts);

  // Flags live on the theme so the review UI can render them beside the
  // questions they describe, without needing the report alongside.
  const flaggedThemes = current.themes.map((theme, i) => {
    const reasons = stillFailing.get(i);
    return reasons && reasons.length > 0
      ? { ...theme, flags: reasons }
      : { ...theme, flags: undefined };
  });

  return {
    guide: { ...current, themes: flaggedThemes },
    report: {
      initial,
      final: verdicts,
      regenerated,
      unresolved: Array.from(stillFailing.entries()).map(([themeIndex, reasons]) => ({
        themeIndex,
        themeLabel: current.themes[themeIndex]?.theme ?? `Theme ${themeIndex + 1}`,
        reasons,
      })),
    },
  };
}
