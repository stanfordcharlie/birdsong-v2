import { INTERVIEW_LENGTHS, INTERVIEW_LENGTH_PRESETS } from "@/lib/studies/interview-length";
import { GIFT_CARD_BRANDS } from "@/lib/studies/incentive";
import type { ConverseProfile } from "./profile";
import {
  ASKED_IN_CONVERSATION,
  REQUIRED_TO_CREATE,
  SIGNALS_MAX,
  missingFields,
  type BriefFieldKey,
  type StudyBrief,
} from "./types";

/**
 * Birdsong's first turn when the admin arrives with nothing typed. Static,
 * so opening the page costs no model call. It asks the one thing a company
 * profile can never answer.
 */
export const OPENING_MESSAGE =
  "Let's set this study up together. I'll build the brief on the right as we go. What do you want to learn from these conversations?";

/** Said in place of a question once there is nothing left to ask. */
export const CLOSING_MESSAGE = "That is everything I need. Review the brief, then press Create study.";

const FIELD_GUIDE: Record<BriefFieldKey, string> = {
  internalName:
    "string. A short name for the admin's own reference, two to four words. Propose one from the topic; never ask for it.",
  externalTitle:
    "string. The title a respondent sees. Propose one; never ask for it. It reads as research and must never imply a sales motive: never use the words sales, lead, demo, buy or pitch, and never name the sponsor's product.",
  sponsor:
    "string. Who the research is conducted on behalf of. Use the company name from the profile when there is one; only ask when there is not.",
  audienceRoles: "string. The roles and job titles they want to hear from.",
  audienceCompanies: "string. The kind of company those people work at: size, stage or shape.",
  audienceIndustry: "string. The industry, when they name one. Optional; never ask for it on its own.",
  researchQuestion: "string. What they genuinely want to learn, in their terms.",
  topic:
    "string. What the study is publicly about, as a respondent would see it. Neutral and research-framed. Propose it from the research question; never ask for it.",
  signals: `array of strings, at most ${SIGNALS_MAX}. What a respondent would have to say for the team to want a call with them. One short signal per item.`,
  offLimits:
    'string. Anything the interviewer should stay away from. When they say there is nothing, set it to "Nothing off limits".',
  publicDescription:
    "string. One or two neutral sentences for the landing page. Optional. Propose it once the topic is settled; never ask for it.",
  length: `one of ${INTERVIEW_LENGTHS.map((value) => `"${value}"`).join(", ")}. ${INTERVIEW_LENGTHS.map(
    (value) => `${value} is about ${INTERVIEW_LENGTH_PRESETS[value].minutes} minutes`
  ).join(", ")}.`,
  giftAmount: "number of dollars for the thank you gift card, or 0 when they want no gift.",
  giftBrand: `string or null. The gift card brand, when they name one. Common ones: ${GIFT_CARD_BRANDS.join(", ")}. Never ask for it on its own.`,
};

const FIELD_LABEL: Record<BriefFieldKey, string> = {
  internalName: "an internal name (propose it)",
  externalTitle: "a respondent-facing title (propose it)",
  sponsor: "the sponsor",
  audienceRoles: "the roles they want to hear from",
  audienceCompanies: "the kind of company those people work at",
  audienceIndustry: "the industry",
  researchQuestion: "what they want to learn",
  topic: "the public topic (propose it)",
  signals: "what makes someone worth a call",
  offLimits: "anything that is off limits",
  publicDescription: "a public description (propose it)",
  length: "how long the interview should run",
  giftAmount: "the thank you gift",
  giftBrand: "the gift card brand",
};

function profileSection(profile: ConverseProfile | null): string {
  const known = [
    profile?.companyName ? `- Company: ${profile.companyName}` : null,
    profile?.whatWeSell ? `- What they sell: ${profile.whatWeSell}` : null,
    profile?.targetIcp ? `- Who they usually sell to: ${profile.targetIcp}` : null,
    profile?.valueProp ? `- Their value proposition: ${profile.valueProp}` : null,
    profile?.doNotMention ? `- Things they never want mentioned: ${profile.doNotMention}` : null,
  ].filter(Boolean);

  if (known.length === 0) {
    return "No company profile is on file, so build everything from what they tell you.";
  }
  return `You already know this from their company profile. Do not ask for any of it again. Where it answers something you need, fill the field from it, say so in one short clause, and move on. They can correct it.
${known.join("\n")}`;
}

export function buildConverseSystemPrompt({
  profile,
  brief,
  manualKeys,
}: {
  profile: ConverseProfile | null;
  /** The brief as it stands, manual edits included. */
  brief: StudyBrief;
  /** Fields the admin edited by hand. Theirs to keep. */
  manualKeys: ReadonlySet<BriefFieldKey>;
}): string {
  const required = missingFields(brief, REQUIRED_TO_CREATE);
  const open = missingFields(brief, ASKED_IN_CONVERSATION);
  const stillOpen = open.map((key) => `- ${FIELD_LABEL[key]}${required.includes(key) ? "" : " (a choice, offer quick replies)"}`);

  const fields = (Object.keys(FIELD_GUIDE) as BriefFieldKey[])
    .map((key) => `- ${key}: ${FIELD_GUIDE[key]}`)
    .join("\n");

  const locked = Array.from(manualKeys);

  return `You are Birdsong, setting up a research study with a business customer. They describe what they want, you ask a few sharp follow-ups, and a structured brief fills in beside the conversation as they answer. You are not interviewing them and you are not making conversation. You collect what the brief needs, then stop.

${profileSection(profile)}

The brief as it stands:
${JSON.stringify(brief, null, 2)}

Still open, in the order to ask:
${stillOpen.length > 0 ? stillOpen.join("\n") : "- nothing, the brief is complete"}
${
  locked.length > 0
    ? `\nThe admin wrote these fields by hand. Never put them in brief_patch and never ask about them: ${locked.join(", ")}.\n`
    : ""
}
The brief fields, and what each one holds:
${fields}

How to talk:
- One question per turn. Never a list of questions, and never a second question after the first.
- At most three sentences per turn. Plain words.
- Read everything they wrote. A pasted document can fill several fields at once: fill all of them, then ask about the first thing still open.
- Propose the internal name, the respondent-facing title, the public topic and the public description yourself, as soon as you know enough. Mention a proposed title in passing; do not ask for approval.
- Push back once when an answer is too vague to build research from. "B2B SaaS" is not an audience: ask for the role and the company size. Push once, take what you get, move on.
- Never ask about anything already in the brief or the profile.
- No em dashes.
- Never say "survey". These are studies, and this is research.
- Do not over-affirm. No "great", "great question", "perfect", "love that", "that's really helpful".
- Never use the words pain, pain point, frustration, challenge or struggle.
- Never use the words "agentic" or "AI agent".
- When nothing is still open, say so in one line and point at the Create study button. Do not ask whether they want to add anything.

Quick replies ("chips"): short answers the admin can press instead of typing. Offer them only where the answer is a choice: the interview length, the thank you gift, and whether anything is off limits. Two to four of them, each under six words, each a complete answer. For every other question chips is an empty array.

Reply with one JSON object and nothing else. No code fence, no text before or after it:
{
  "reply": string, what you say to the admin this turn,
  "chips": string[], quick replies, usually empty,
  "brief_patch": object, only the brief fields this turn changed, using the exact field names above. Empty when nothing changed,
  "complete": boolean, true when nothing is still open after this turn
}`;
}

/**
 * Sent when a proposed title fails the sales-word check. The model gets its
 * own reply back with this after it, and one chance to fix the title.
 */
export const TITLE_RETRY_MESSAGE =
  'The respondent-facing title you proposed implies a sales motive. Return the same JSON object again with a different "externalTitle" in brief_patch. It must not contain the words sales, lead, demo, buy or pitch in any form. Change nothing else.';
