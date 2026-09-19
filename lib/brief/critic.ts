import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, modelParams } from "@/lib/interview/anthropic";
import type { GuideTheme, StructuredGuide } from "@/lib/studies/guide";
import type { QuestionGuideProfileContext } from "@/lib/studies/question-guide";
import { regenerateTheme, type ThemeDraftAttempt } from "./generate";
import { briefLog, describeError } from "./log";
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
  /** Themes that were redrafted, and why (the critique of the first draft). */
  regenerated: { themeIndex: number; themeLabel: string; reasons: string[] }[];
  /** Themes still failing after every attempt. Surfaced, never hidden. */
  unresolved: { themeIndex: number; themeLabel: string; reasons: string[] }[];
  /** One entry per theme that went through the retry loop. */
  attempts: { themeIndex: number; themeLabel: string; attempts: number; cleared: boolean; kept: number }[];
};

/**
 * Attempts per theme, the initial draft included: one draft and up to two
 * critique-aware redrafts. Not configurable on purpose. Three is where the
 * cost of another model round trip stops buying a better question: a theme
 * that has been told the objection twice and still fails is shown to the
 * admin, whose judgment is cheaper than a fourth draft.
 */
export const MAX_THEME_ATTEMPTS = 3;

const LOG_SCOPE = "brief/critic";

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

function addressTheme(theme: GuideTheme, themeIndex: number): AddressedQuestion[] {
  const out: AddressedQuestion[] = [];
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
        // Forced tool call: thinking is not allowed, so this is all verdicts.
    ...modelParams({ maxTokens: 4096, thinking: "off" }),
        system: CRITIC_SYSTEM,
    messages: [{ role: "user", content: `Questions to review:\n\n${listing}` }],
    tools: [CRITIC_TOOL],
    tool_choice: { type: "tool", name: "record_verdicts" },
  });

  const toolUse = result.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  const failures = new Map<string, string[]>();
  if (!toolUse) {
    // Behaviour unchanged (every question passes), but it is no longer
    // silent: a review that returned no verdicts is worth knowing about.
    console.error(
      JSON.stringify({
        scope: LOG_SCOPE,
        requestId: "critic",
        event: "failure",
        phase: "review_no_tool_use",
        stopReason: result.stop_reason ?? null,
        blockTypes: result.content.map((block) => block.type),
        modelRequestId: (result as { _request_id?: string })._request_id ?? null,
        questions: questions.length,
      })
    );
    return failures;
  }

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

/**
 * One validation sweep over a set of addressed themes: lexical, then the
 * model. `themes` carries each theme with the index it has in the guide,
 * so the ids the model answers against are the guide's own.
 */
async function reviewThemes(
  themes: { theme: GuideTheme; themeIndex: number }[]
): Promise<QuestionVerdict[]> {
  const questions = themes.flatMap(({ theme, themeIndex }) => addressTheme(theme, themeIndex));
  const modelFailures = await modelVerdicts(questions);

  const verdicts: QuestionVerdict[] = questions.map((q) => {
    const failures = [...lexicalFailures(q.question, q.slot), ...(modelFailures.get(q.id) ?? [])];
    return { ...q, pass: failures.length === 0, failures };
  });

  // Theme-shaped failures attach to that theme's opening question, so a
  // theme missing its numeric follow-up entirely still fails something.
  for (const { theme, themeIndex } of themes) {
    const problems = themeFailures(theme);
    if (problems.length === 0) continue;
    const opening = verdicts.find((v) => v.themeIndex === themeIndex && v.slot === "opening");
    if (opening) {
      opening.failures.push(...problems);
      opening.pass = false;
    }
  }

  return verdicts;
}

/** One full validation sweep over a guide: lexical, then the model. */
export async function reviewGuide(guide: StructuredGuide): Promise<QuestionVerdict[]> {
  return reviewThemes(guide.themes.map((theme, themeIndex) => ({ theme, themeIndex })));
}

/**
 * One theme on its own. The critic judges questions individually, so a
 * theme's verdict does not depend on its neighbours; reviewing it alone is
 * what lets one theme be retried without re-judging (and possibly newly
 * failing) the ones that already passed.
 */
export async function reviewTheme(theme: GuideTheme, themeIndex: number): Promise<QuestionVerdict[]> {
  return reviewThemes([{ theme, themeIndex }]);
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

/** The critique for one theme, in the form the redraft prompt and the UI both use. */
function critiqueFor(verdicts: QuestionVerdict[], themeIndex: number): string[] {
  return failuresByTheme(verdicts).get(themeIndex) ?? [];
}

export type ThemeRetryResult = {
  themeIndex: number;
  themeLabel: string;
  /** The version that ships: the first to clear, else the least-flagged. */
  theme: GuideTheme;
  verdicts: QuestionVerdict[];
  critique: string[];
  cleared: boolean;
  /** Attempts made, the initial draft included. */
  attempts: number;
  /** Which attempt's draft was kept, 1-based. */
  kept: number;
};

/**
 * The retry loop for one theme, with the model calls injected so the
 * control flow can be tested without them.
 *
 * Attempt 1 is the initial draft, already reviewed. Each further attempt
 * redrafts with the full history of prior drafts and their critiques in
 * hand, re-reviews just this theme, and stops on the first clear pass. A
 * redraft that throws or comes back unparseable is a failed attempt, not a
 * crash: it is recorded and the loop moves on. If nothing clears, the
 * least-flagged draft ships, flagged, and the admin decides.
 */
export async function retryTheme({
  themeIndex,
  themeLabel,
  initialTheme,
  initialVerdicts,
  redraft,
  review,
  requestId,
}: {
  themeIndex: number;
  themeLabel: string;
  initialTheme: GuideTheme;
  initialVerdicts: QuestionVerdict[];
  /** Redraft given the history so far. Null means nothing parseable came back. */
  redraft: (history: ThemeDraftAttempt[]) => Promise<GuideTheme | null>;
  review: (theme: GuideTheme) => Promise<QuestionVerdict[]>;
  requestId: string;
}): Promise<ThemeRetryResult> {
  const initialCritique = critiqueFor(initialVerdicts, themeIndex);
  const history: ThemeDraftAttempt[] = [{ attempt: 1, theme: initialTheme, critique: initialCritique }];

  let best: ThemeRetryResult = {
    themeIndex,
    themeLabel,
    theme: initialTheme,
    verdicts: initialVerdicts,
    critique: initialCritique,
    cleared: initialCritique.length === 0,
    attempts: 1,
    kept: 1,
  };

  briefLog(LOG_SCOPE, requestId, "attempt", {
    themeIndex,
    themeLabel,
    attempt: 1,
    critique: initialCritique,
    cleared: best.cleared,
  });
  if (best.cleared) return best;

  for (let attempt = 2; attempt <= MAX_THEME_ATTEMPTS; attempt++) {
    const startedAt = Date.now();

    let theme: GuideTheme | null = null;
    try {
      theme = await redraft(history);
    } catch (err) {
      briefLog(LOG_SCOPE, requestId, "redraft_error", { themeIndex, themeLabel, attempt, ...describeError(err) });
    }

    if (!theme) {
      const critique = ["Redraft returned nothing usable."];
      history.push({ attempt, theme: history[history.length - 1].theme, critique });
      briefLog(LOG_SCOPE, requestId, "attempt", {
        themeIndex,
        themeLabel,
        attempt,
        critique,
        cleared: false,
        parsed: false,
        durationMs: Date.now() - startedAt,
      });
      best = { ...best, attempts: attempt };
      continue;
    }

    const verdicts = await review(theme);
    const critique = critiqueFor(verdicts, themeIndex);
    const cleared = critique.length === 0;
    history.push({ attempt, theme, critique });
    briefLog(LOG_SCOPE, requestId, "attempt", {
      themeIndex,
      themeLabel,
      attempt,
      critique,
      cleared,
      parsed: true,
      durationMs: Date.now() - startedAt,
    });

    // The least-flagged draft wins, later attempts winning ties: the
    // redraft was told about every earlier objection, so at equal flag
    // counts it is the one that has not reintroduced an old problem.
    if (cleared || critique.length <= best.critique.length) {
      best = { themeIndex, themeLabel, theme, verdicts, critique, cleared, attempts: attempt, kept: attempt };
    } else {
      best = { ...best, attempts: attempt };
    }
    if (cleared) break;
  }

  briefLog(LOG_SCOPE, requestId, "theme_result", {
    themeIndex,
    themeLabel,
    attempts: best.attempts,
    cleared: best.cleared,
    kept: best.kept,
    remaining: best.critique,
  });
  return best;
}

/**
 * The mandatory pass. Review the whole draft once, then put every failing
 * theme through its own retry loop (see retryTheme), each in isolation and
 * all in parallel: a theme that passed the first review is never re-judged
 * or redrafted because a neighbour failed, and one theme running out of
 * attempts changes nothing about the others.
 *
 * A theme that still fails is kept and flagged rather than dropped or
 * silently shipped: the review step renders the flag, and the person
 * commissioning the study decides what to do about it.
 */
export async function runCriticPass({
  brief,
  profile,
  guide,
  requestId = "critic",
}: {
  brief: ExtractedBrief;
  profile: QuestionGuideProfileContext | null;
  guide: StructuredGuide;
  /** Carried onto every log line so an attempt can be matched to its request. */
  requestId?: string;
}): Promise<{ guide: StructuredGuide; report: CriticReport }> {
  const initial = await reviewGuide(guide);
  const failing = failuresByTheme(initial);

  const results = await Promise.all(
    Array.from(failing.keys()).map((themeIndex) =>
      retryTheme({
        themeIndex,
        themeLabel: guide.themes[themeIndex].theme,
        initialTheme: guide.themes[themeIndex],
        initialVerdicts: initial.filter((v) => v.themeIndex === themeIndex),
        // The other themes go in from the original guide: they are either
        // passing and untouched, or in their own loop, and a redraft only
        // needs to know what territory it must not land on.
        redraft: (history) => regenerateTheme({ brief, profile, guide, index: themeIndex, history }),
        review: (theme) => reviewTheme(theme, themeIndex),
        requestId,
      })
    )
  );

  const byTheme = new Map(results.map((r) => [r.themeIndex, r]));
  const themes = guide.themes.map((theme, i) => {
    const result = byTheme.get(i);
    if (!result) return { ...theme, flags: undefined };
    return result.cleared ? { ...result.theme, flags: undefined } : { ...result.theme, flags: result.critique };
  });

  // Final verdicts: the initial sweep, with each retried theme's verdicts
  // replaced by those of the draft that shipped.
  const final = guide.themes.flatMap((_, i) => {
    const result = byTheme.get(i);
    return result ? result.verdicts : initial.filter((v) => v.themeIndex === i);
  });

  return {
    guide: { ...guide, themes },
    report: {
      initial,
      final,
      regenerated: results
        .filter((r) => r.attempts > 1)
        .map((r) => ({ themeIndex: r.themeIndex, themeLabel: r.themeLabel, reasons: critiqueFor(initial, r.themeIndex) })),
      unresolved: results
        .filter((r) => !r.cleared)
        .map((r) => ({ themeIndex: r.themeIndex, themeLabel: r.themeLabel, reasons: r.critique })),
      attempts: results.map((r) => ({
        themeIndex: r.themeIndex,
        themeLabel: r.themeLabel,
        attempts: r.attempts,
        cleared: r.cleared,
        kept: r.kept,
      })),
    },
  };
}
