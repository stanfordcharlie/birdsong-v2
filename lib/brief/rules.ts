/**
 * The question quality rules.
 *
 * One copy, shared by the generator (lib/brief/generate.ts) and the critic
 * pass (lib/brief/critic.ts) so the thing being written and the thing
 * checking it can never drift apart. Editing a rule here changes both.
 *
 * These exist because customers write survey questions: abstract, general,
 * opinion seeking. Those produce thin answers, which produce weak reports.
 * Guide quality is the upstream lever, so the platform writes the guide.
 */
export const QUESTION_RULES = `Concrete over abstract. Anchor every question in a recent specific instance, never in general process. "Walk me through the last time a shipment got rerouted after dispatch" outperforms "how do you handle rerouting". Every opening question must be answerable with a story, not a description. If a question could be answered in the abstract by someone who has never actually done the thing, it is wrong.

Workaround archaeology. At least one theme must ask what the respondent did manually or repeatedly in a recent period. What people actually spend time on is the highest yield question type available, and it is pure research: it asks what happened, not how they feel about it.

Consequence chains. At least one theme must follow an event outward. Who else noticed, what happened next, what it affected downstream. This surfaces impact without ever asking about cost.

Recency anchoring. Prefer last week, last month, the most recent instance, the last time. Recency produces specificity. A question with no time anchor invites a generalization.

Quantification. Every theme carries exactly one numeric follow-up. How often, how many, how long, how many people. These feed report counts and score reliability, so they must ask for a number and not for an impression.

No leading questions. Never presuppose a problem, a difficulty, a preference, or an opinion. Every question must be equally answerable by someone for whom the thing works completely fine. Asking what is hard about something, what gets in the way, what slows them down, or what they wish were different all presuppose an answer and are banned.

No yes/no openings. Every opening question is open-ended. Never start a question with do, does, did, is, are, was, were, have, has, had, can, could, will, would, or should.

Never name a solution, a product, a vendor, a tool category, or anything the sponsor sells. No "platform", no "automation", no "software category". Ask about what people do, not what they use to do it, unless they name it first.

Never mention pain points, challenges, frustrations, problems, difficulties, struggles, obstacles, or solutions in any respondent-facing question text.

One question per question. No compound questions. No "and what about", no second question tacked on after a comma or an "and". One question mark per question string.

No em dashes anywhere.

Vocabulary: research and studies, never survey. Never the words agentic or AI agent.`;

/**
 * Words that must never appear in a respondent-facing question. Checked
 * lexically by the critic before any model is asked, because these are
 * cheap to detect and expensive to ship.
 */
export const BANNED_QUESTION_TERMS = [
  "pain point",
  "pain",
  "frustrat",
  "challenge",
  "struggl",
  "obstacle",
  "problem",
  "solution",
  "difficult",
  "survey",
  "agentic",
  "ai agent",
] as const;

/** Openers that make a question answerable with one word. */
export const YES_NO_OPENERS = [
  "do",
  "does",
  "did",
  "is",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
  "should",
] as const;
