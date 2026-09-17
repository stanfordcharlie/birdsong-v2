/**
 * Seeds a study and a set of completed interviews by actually running the
 * interview, not by writing fixtures.
 *
 *   npx tsx scripts/seed-responses.ts --create --count=16
 *   npx tsx scripts/seed-responses.ts --slug=<existing-slug> --count=8
 *
 * How this differs from the one-click demo dataset (POST /api/sample-data,
 * fed by lib/sample-data.ts): that path writes hardcoded transcripts with
 * hardcoded lead_score, pain_points, and call_script values, on purpose, so
 * seeding a demo is instant, free, and deterministic. Nothing in it exercises
 * the interview loop or the extraction prompt.
 *
 * This script is the opposite trade. For every respondent it:
 *   1. builds the real interviewer system prompt (buildInterviewSystemPrompt),
 *   2. drives a real turn-by-turn interview against Claude, with a second
 *      Claude call playing the respondent persona,
 *   3. strips chips with the real parser and honours the real COMPLETE_TOKEN
 *      and MAX_EXCHANGES stopping rules,
 *   4. runs the real extractInterviewInsights against the finished transcript.
 *
 * So the lead scores, pain points, signals, and call scripts written here are
 * whatever the production extraction prompt actually produced. Nothing about
 * the interview or the scoring is faked, and none of it is tuned after the
 * fact. That is the whole point: a seeded study should be able to surface a
 * regression in the real path.
 *
 * The one thing that has no production counterpart is the respondent. Real
 * respondents are people; here a persona prompt stands in for one. Personas
 * carry a friction level (urgent / clear / mild / none) that shapes what they
 * have to say, never what they are allowed to score: the extraction pass is
 * free to disagree with the persona's intent, and when it does, the score it
 * returned is what gets written.
 *
 * Writes real rows. --create inserts one `surveys` row; the seed pass inserts
 * one `responses` row per respondent with is_test = false, because the Leads
 * queue hides test rows behind a toggle, the survey detail page filters them
 * out, and POST /api/surveys/[id]/report excludes them outright. A study
 * seeded as test data cannot exercise any of those three surfaces.
 *
 * Notifications (Resend, Slack, HubSpot) are OFF unless --notify is passed.
 * Without the flag this script never reaches the notification code at all.
 *
 * Every run writes scripts/seed-cleanup/<slug>.json with the survey id and
 * every response id it created; scripts/seed-cleanup.ts consumes that file.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// Must run before anything reads process.env.
loadEnvFile(path.join(process.cwd(), ".env.local"));

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import {
  buildInterviewSystemPrompt,
  buildKickoffMessage,
  KICKOFF_MESSAGE,
  COMPLETE_TOKEN,
  MAX_EXCHANGES,
} from "@/lib/interview-prompt";
import { extractInterviewInsights, type CompanyProfile } from "@/lib/interview/extract";
import { parseChips } from "@/lib/interview/chips";
import { generateSessionToken } from "@/lib/interview/token";
import { slugify, randomSlugSuffix } from "@/lib/surveys/slugify";
import { extractEmailDomain, deriveCompanyNameFromDomain, isFreeEmailDomain } from "@/lib/interview/work-email";
import { sanitizeCustomFieldValues } from "@/lib/interview/validation";
import { sendLeadNotification } from "@/lib/email/lead-notification";
import { sendLeadNotificationToSlack } from "@/lib/slack/lead-notification";
import { syncResponseToHubSpot } from "@/lib/hubspot-sync";
import { selectCallScriptOpener, selectTopPainPoint } from "@/lib/lead-content";
import type { InterviewMessage } from "@/lib/interview/types";
import type { Database, Json } from "@/types/database";

// --- Environment -----------------------------------------------------------

// Same fifteen-line loader scripts/test-hubspot-sync.ts uses, for the same
// reason: next dev loads .env.local itself and this is not worth a dependency.
// Existing process.env values win, so a var can still be overridden inline.
function loadEnvFile(file: string): void {
  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    return; // Fine: the required-variable check below reports what is missing.
  }
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) fatal(`${name} is not set. Add it to .env.local or pass it inline.`);
  return value;
}

// --- Output ----------------------------------------------------------------

const BAR = "─".repeat(76);

function heading(title: string): void {
  console.log(`\n${BAR}\n${title}\n${BAR}`);
}

function fatal(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

// --- The account -----------------------------------------------------------

// The study and every response it seeds belong to this account. Resolved
// through auth.users rather than hardcoded, so a wrong or missing account is
// a hard stop instead of an orphaned user_id.
const OWNER_EMAIL = "charlie@usebirdsong.com";

// --- The study (--create) --------------------------------------------------

// custom_fields uses the object shape lib/surveys/respondent-fields.ts parses:
// preset keys (job_title) carry a label and a required flag, and anything the
// admin defines beyond the presets is a custom_-prefixed key from
// slugifyCustomFieldKey. Company size is not a preset, so it is a custom
// field; the shape supports it, and it is optional per the brief.
const STUDY = {
  title: "How RevOps teams handle lead routing and CRM hygiene",
  external_title: "How RevOps teams handle lead routing and CRM hygiene",
  topic:
    "lead routing, CRM data quality, and handoff between marketing and sales at mid-market B2B SaaS companies",
  sponsor: "Meridian Ops",
  // One of SURVEY_TONE_OPTIONS (lib/survey-onboarding/types.ts): the three
  // allowed values are Conversational, Peer-to-peer, and Academic.
  tone: "Conversational",
  num_questions: 10,
  gift_card_amount: 50,
  question_guide: `1. How inbound leads reach the right rep today, and what the routing rules actually look like in practice.

2. Who owns the routing logic, how often it gets changed, and what a change to it involves.

3. What happens to a lead that does not match any routing rule, and where it ends up.

4. How CRM records get created and merged, and who touches a record along the way.

5. How the team handles duplicates and records that have gone stale, and how often that work comes around.

6. Whether required fields and data standards are enforced anywhere, and what enforcement looks like if so.

7. What the handoff looks like from the moment marketing marks a lead qualified to the moment a rep works it.

8. How the two teams arrived at what qualified means, and what happens when they read a lead differently.

9. What gets measured about routing speed and record quality, and who actually looks at those numbers.

10. What the team has changed about any of this in the last year, and what set that change in motion.`,
  custom_fields: [
    { key: "job_title", label: "Job title", required: true },
    { key: "custom_company_size", label: "Company size", required: false },
  ],
} as const;

// --- Personas --------------------------------------------------------------

// Friction level shapes what the persona has to say, never what they score.
//
// urgent: mid evaluation or close to a renewal. They describe a budget cycle
//   and a concrete workaround they run today. They never announce that they
//   are unhappy; the state of things has to be readable from what they
//   describe, the way it is with a real respondent.
// clear:  real, specific friction they can describe, with no project or
//   budget attached to it.
// mild:   things mostly work; friction is small, occasional, and tolerated.
// none:   genuinely settled here. Whatever is hard for them sits somewhere
//   this study is not asking about.
type FrictionLevel = "urgent" | "clear" | "mild" | "none";

type Persona = {
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  companySize: string;
  friction: FrictionLevel;
  /** Persona-specific detail the simulator builds its answers out of. */
  brief: string;
  /** Days before now the response is backdated to. */
  daysAgo: number;
};

// Sixteen invented people at sixteen invented companies. No name, company, or
// domain here corresponds to a real one, and none of the addresses is the
// owner's. Ordered urgent, clear, mild, none; daysAgo interleaves them so the
// seeded queue is not sorted by friction.
const PERSONAS: Persona[] = [
  // --- urgent (3) ---
  {
    name: "Dana Reinholt",
    email: "d.reinholt@calderwoodanalytics.com",
    jobTitle: "Director of Revenue Operations",
    company: "Calderwood Analytics",
    companySize: "240",
    friction: "urgent",
    daysAgo: 3,
    brief:
      "Runs RevOps for a 240-person analytics platform. Their routing lives in a set of workflow rules nobody has fully mapped since the person who built them left last year, so when a rule needs changing Dana rebuilds the branch from scratch and tests it against a list of twelve sample records she keeps in a spreadsheet. Anything that misses every rule drops into an unassigned queue she personally works down every morning before standup, which takes her about forty minutes. Their contract with the current routing tooling renews in November and she has a budget line approved for the next fiscal year to replace or extend it, so she has three vendors in a spreadsheet and has already sat through two demos. She talks about all of this matter-of-factly, as work she does, never as something she resents.",
  },
  {
    name: "Priyanka Ghosal",
    email: "p.ghosal@harrowgatesoftware.com",
    jobTitle: "VP Revenue Operations",
    company: "Harrowgate Software",
    companySize: "310",
    friction: "urgent",
    daysAgo: 8,
    brief:
      "VP RevOps at a 310-person software company. Marketing and sales disagreed often enough about what counted as qualified that she built a scoring model in a spreadsheet that gets uploaded to the CRM every Monday morning by an ops analyst, because the CRM's native scoring could not express the rule they actually agreed on. Duplicate records are handled by a dedupe job that runs quarterly and a shared queue of merge candidates the analyst works through by hand. Their CRM contract is up for renewal in Q1 and finance asked her to justify the seat count, so she is in the middle of an evaluation of what to keep and what to move. Two vendors have quoted. She describes the Monday upload as simply the process, not as a complaint.",
  },
  {
    name: "Marcus Delacroix",
    email: "m.delacroix@iselinnetworks.com",
    jobTitle: "Head of Sales Operations",
    company: "Iselin Networks",
    companySize: "480",
    friction: "urgent",
    daysAgo: 14,
    brief:
      "Heads sales ops at a 480-person networking software company with three sales segments and a partner channel. Territory assignment and segment routing are two separate rule sets that occasionally both claim the same account, and the tiebreak is a Slack channel where two managers sort it out by hand, usually within the day. Required fields are enforced on the opportunity object but not on the lead object, so records arrive thin and get filled in later or not at all. They are eight weeks from a renewal on their enrichment vendor, budget is committed for next year either way, and he has been asked to bring a recommendation to the CRO. He is factual and slightly dry about all of it.",
  },
  // --- clear (5) ---
  {
    name: "Tessa Aumonier",
    email: "tessa.a@northgrovesystems.com",
    jobTitle: "Marketing Operations Lead",
    company: "Northgrove Systems",
    companySize: "180",
    friction: "clear",
    daysAgo: 5,
    brief:
      "Marketing ops lead at a 180-person infrastructure software company. Routing is round-robin inside three pools and works fine, but the handoff is where things get thin: marketing marks a lead qualified and it lands in the rep's queue with the form fill and nothing else, so reps regularly call people who had already been in a conversation with someone else two months earlier. She keeps a manual note field she asks reps to check. No project, no budget, and she has not raised it formally with anyone.",
  },
  {
    name: "Ollie Standish",
    email: "ollie.standish@pinebluffdigital.com",
    jobTitle: "Revenue Operations Manager",
    company: "Pinebluff Digital",
    companySize: "130",
    friction: "clear",
    daysAgo: 10,
    brief:
      "RevOps manager at a 130-person digital experience platform. Their CRM has four different ways a company name can be spelled and nobody enforces a picklist, so account matching fails often enough that he runs a fuzzy-match report every couple of weeks and merges by hand. Routing itself is a single owner field set by a workflow and rarely misfires. He can describe the merge work in detail, including that it takes him most of a Thursday afternoon, but there is no initiative around it and nobody above him has asked.",
  },
  {
    name: "Ingrid Vasterling",
    email: "i.vasterling@thornhilldataworks.com",
    jobTitle: "Director of Sales Operations",
    company: "Thornhill Data Works",
    companySize: "355",
    friction: "clear",
    daysAgo: 17,
    brief:
      "Sales ops director at a 355-person data tooling company. Speed to first touch is measured and reported weekly, and the number is worse than leadership would like because leads route correctly but sit in a queue overnight when they arrive after 4pm Pacific and no one covers the evening. Their fix so far is a rotation two reps volunteered for. Record quality is decent because their forms are long, though she notes the long forms cost them conversions. She is candid and specific, with no active project.",
  },
  {
    name: "Bekele Amsalu",
    email: "b.amsalu@fennimoresystems.com",
    jobTitle: "Marketing Operations Manager",
    company: "Fennimore Systems",
    companySize: "265",
    friction: "clear",
    daysAgo: 20,
    brief:
      "Marketing ops manager at a 265-person systems company. Their lifecycle stages were designed three years ago for a much smaller funnel and now half the records sit in a stage called Engaged that means nothing to anyone. Reps ignore the stage entirely and sort their own queue by company size. Routing works. He has proposed reworking the stages twice and it keeps getting deprioritized behind campaign work.",
  },
  {
    name: "Corinne Ashby-Doyle",
    email: "corinne@larkspurgrid.com",
    jobTitle: "RevOps Manager",
    company: "Larkspur Grid",
    companySize: "145",
    friction: "clear",
    daysAgo: 24,
    brief:
      "RevOps manager at a 145-person energy software company. They route on a self-reported company size field from the form, which respondents fill in wrong constantly, so mid-market leads land with the SMB team and get bounced back a day or two later. She built a weekly report that catches the misroutes after the fact. Enrichment would fix it and she knows that; nobody has costed it out and it is not on any roadmap.",
  },
  // --- mild (4) ---
  {
    name: "Yusuf Karabekir",
    email: "y.karabekir@verradocloud.com",
    jobTitle: "Sales Operations Manager",
    company: "Verrado Cloud",
    companySize: "420",
    friction: "mild",
    daysAgo: 6,
    brief:
      "Sales ops at a 420-person cloud company that rebuilt its routing eighteen months ago and is broadly happy with it. Occasional edge cases, maybe one a week, where a lead from an existing customer domain routes to new business instead of the account team, and someone reassigns it. Record quality is fine. He is content and says so plainly, without being dismissive of the questions.",
  },
  {
    name: "Fionnuala Brennock",
    email: "f.brennock@saltmarshdata.com",
    jobTitle: "Head of Revenue Operations",
    company: "Saltmarsh Data",
    companySize: "160",
    friction: "mild",
    daysAgo: 12,
    brief:
      "Heads RevOps at a 160-person data company. Routing and hygiene are in reasonable shape since they standardised on one CRM last year. Her small ongoing annoyance is that marketing and sales report on slightly different definitions of a qualified lead, so the two dashboards never match and she gets asked about the gap in every QBR. She has explained it enough times that it is now a joke rather than an issue.",
  },
  {
    name: "Raj Muthukrishnan",
    email: "raj.m@marlowepoint.com",
    jobTitle: "Director of Marketing Operations",
    company: "Marlowe Point Software",
    companySize: "190",
    friction: "mild",
    daysAgo: 19,
    brief:
      "Marketing ops director at a 190-person software company. They are on a fairly modern stack and most of this works. Duplicates get created when the same person registers for a webinar with a personal address, which their dedupe rules do not catch because the addresses genuinely differ, so a handful accumulate each month and someone clears them when they notice. Small, known, tolerated.",
  },
  {
    name: "Delphine Okonkwo",
    email: "d.okonkwo@quillbrook.io",
    jobTitle: "RevOps Lead",
    company: "Quillbrook",
    companySize: "75",
    friction: "mild",
    daysAgo: 26,
    brief:
      "RevOps lead and effectively the whole ops function at a 75-person company. At their size routing is simple: four reps, round robin, done. Her mild friction is that she is the only person who knows how any of it is wired, so nothing can change while she is on holiday. She mentions this lightly. Otherwise the setup suits the size of the team.",
  },
  // --- none (4) ---
  {
    name: "Gareth Pellowe",
    email: "g.pellowe@tessellatelabs.com",
    jobTitle: "Sales Operations Manager",
    company: "Tessellate Labs",
    companySize: "95",
    friction: "none",
    daysAgo: 2,
    brief:
      "Sales ops at a 95-person developer tooling company that is almost entirely product-led. Practically no inbound lead routing happens because signups self-serve and sales only gets involved on expansion, which comes from usage thresholds rather than forms. He answers the questions honestly and keeps landing on the fact that this shape of work does not really exist at his company. What is actually hard for him is usage-based forecasting, which is not what is being asked about.",
  },
  {
    name: "Sunniva Halvorsen",
    email: "s.halvorsen@ostergaardtech.com",
    jobTitle: "Head of Sales Operations",
    company: "Ostergaard Technologies",
    companySize: "200",
    friction: "none",
    daysAgo: 15,
    brief:
      "Heads sales ops at a 200-person company that finished a full CRM and routing rebuild nine months ago with an external partner. Everything in this territory is documented, owned, monitored, and working, and she is genuinely pleased with it. Her attention is entirely on sales compensation design at the moment. She is friendly and forthcoming but has nothing sore to report here.",
  },
  {
    name: "Tobias Renner-Whitlock",
    email: "t.renner@brightsillinteractive.com",
    jobTitle: "Revenue Operations Manager",
    company: "Brightsill Interactive",
    companySize: "88",
    friction: "none",
    daysAgo: 22,
    brief:
      "RevOps manager at an 88-person company selling entirely through two channel partners. Leads are the partners' leads, routing means passing a deal registration form to the right partner manager, and CRM hygiene is a partner obligation in the contract. Nothing in this study's territory is his to run. He is polite and a bit amused by how little of it applies.",
  },
  {
    name: "Amara Chidozie",
    email: "a.chidozie@kesterline.io",
    jobTitle: "Marketing Operations Lead",
    company: "Kesterline",
    companySize: "62",
    friction: "none",
    daysAgo: 28,
    brief:
      "Marketing ops lead at a 62-person company doing almost all of its pipeline through outbound and events. Inbound is a trickle they handle by hand, one person checks a shared inbox twice a day, and it works because the volume is tiny. Data quality is fine for the same reason. She is relaxed about all of it and does not manufacture concerns she does not have.",
  },
];

// --- Respondent simulator --------------------------------------------------

// The only part of this script with no production counterpart. Kept to a
// single system prompt so it is obvious what is synthetic here and what is
// the real path: everything else in the loop below is imported from lib/.
function buildPersonaSystemPrompt(persona: Persona): string {
  const frictionDirection: Record<FrictionLevel, string> = {
    urgent:
      "You are close to a decision on this. A renewal or a budget cycle is genuinely in play and you can say so if it comes up naturally, and you have a real workaround you run today that you can describe step by step. Critically: you never announce that you are unhappy, never say that something is a problem or painful or frustrating, and never editorialise about your setup. You describe what you do and how long it takes, flatly, the way someone describes their own job. Let the listener draw their own conclusion.",
    clear:
      "You have specific, concrete friction you can describe in detail if asked about the right area, including roughly how much time it costs. There is no project and no budget attached to it, nobody senior has asked you about it, and you are not pushing for anything. It is just true.",
    mild: "Things mostly work. There is one small, occasional annoyance you can name if the conversation goes near it, and you treat it as minor because it is. Do not inflate it.",
    none: "This area is genuinely settled for you, or barely applies to how your company works. Say so plainly and specifically rather than inventing concerns to be helpful. If something is hard in your job, it is somewhere else, and you can mention that if it comes up.",
  };

  return `You are role-playing a respondent in a one-on-one market research interview. You are ${persona.name}, ${persona.jobTitle} at ${persona.company}, a B2B SaaS company with about ${persona.companySize} employees. You are not an assistant and you are not the interviewer. You only ever produce ${persona.name}'s reply.

Who you are and what is true about your work:
${persona.brief}

Where you sit on this topic:
${frictionDirection[persona.friction]}

How you talk:
- Like a busy operations person on a research call, not like written prose. Contractions, sentence fragments where natural, occasional "honestly" or "I mean".
- LENGTH IS THE THING YOU WILL GET WRONG. Aim for about fifteen words per answer. One sentence, very often just a fragment. Two sentences is already a long answer for you and should be uncommon. Three is rare and only when you are literally walking through steps in order. You are typing between meetings.
  Calibration, this is the register and the length you are aiming for:
    "Round robin inside three pools. That's it, really."
    "Honestly? A spreadsheet. Has been for years."
    "Someone on my team catches it, usually a day or two later."
    "No idea. That predates me."
- Answer the question you were asked and then stop. Do not volunteer a second process, a second example, or a related area the interviewer did not ask about. Do not pre-empt the obvious follow-up. Letting the interviewer dig is the point.
- One concrete detail per answer, at most: a number, a duration, a tool category, whatever the question is actually about. Never stack two specifics into one answer. Real people give up detail gradually, under questioning, a piece at a time.
- Not every answer needs a new fact. Sometimes you restate what you already said, or say you are not sure, or give a vague answer that makes the interviewer ask again. That is what real conversations sound like.
- Stay inside what your brief says is true. Your brief is a description of your situation, not a checklist to get through: most of it should never come up unless the interviewer asks the question that reaches it.
- If asked something your brief does not cover, invent a detail consistent with it and keep it consistent for the rest of the conversation.
- You may push back, go slightly off on a tangent, or say you do not know. Real respondents do.
- Never use em dashes.
- Never mention that this is simulated, never break character, never refer to the brief, and never name any vendor whose product this research might be about.
- Never ask the interviewer a question back more than once in the whole conversation, and never end an answer by inviting the next question.

Output only what ${persona.name} says next. No name prefix, no quotation marks, no stage directions.`;
}

// --- Anthropic plumbing ----------------------------------------------------

// The interview loop below makes ~20 calls per respondent and runs several
// respondents at once, so overloaded/rate-limited responses are expected
// rather than exceptional. Retries with backoff; anything else throws.
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const retryable = status === 429 || (typeof status === "number" && status >= 500);
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      const waitMs = Math.min(30_000, 2_000 * 2 ** (attempt - 1));
      console.warn(`   ⟳ ${label}: ${status}, retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error("unreachable");
}

function textOf(completion: Anthropic.Message): string {
  return completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

// --- The interview loop ----------------------------------------------------

type Survey = Database["public"]["Tables"]["surveys"]["Row"];

// Mirrors /api/interview/start followed by N x /api/interview/continue,
// minus the HTTP layer, the rate limiters, and the session-token check
// (there is no untrusted caller here). The prompt construction, the chip
// parsing, the COMPLETE_TOKEN check against the raw reply, and the
// MAX_EXCHANGES ceiling are the same code the routes run.
async function runInterview(
  survey: Survey,
  profile: CompanyProfile | null,
  persona: Persona,
  customFieldValues: Record<string, unknown>
): Promise<InterviewMessage[]> {
  const anthropic = getAnthropicClient();
  const respondent = { name: persona.name, customFieldValues };
  const personaSystem = buildPersonaSystemPrompt(persona);

  // --- opening question (the /api/interview/start half) ---
  const openingCompletion = await withRetry(`${persona.name} opening`, () =>
    anthropic.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 512,
      system: buildInterviewSystemPrompt({ survey, companyProfile: profile, respondent, exchangeCount: 0 }),
      messages: [{ role: "user", content: buildKickoffMessage(respondent) }],
    })
  );
  const { text: openingQuestion } = parseChips(textOf(openingCompletion));
  if (!openingQuestion) throw new Error(`${persona.name}: opening question was empty after chip parsing`);

  const history: InterviewMessage[] = [{ role: "assistant", content: openingQuestion }];

  // --- the /api/interview/continue half, until the model calls it ---
  for (;;) {
    // The persona answers the question that is currently last in history.
    // Roles are inverted relative to the interview transcript: from the
    // persona's point of view the interviewer is the assistant it is
    // replying to, so its own past turns are the "assistant" ones.
    const personaTurns: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role === "assistant" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
    const answerCompletion = await withRetry(`${persona.name} answer`, () =>
      anthropic.messages.create({
        model: INTERVIEW_MODEL,
        max_tokens: 400,
        system: personaSystem,
        messages: personaTurns,
      })
    );
    const answer = textOf(answerCompletion);
    if (!answer) throw new Error(`${persona.name}: persona produced an empty answer`);

    history.push({ role: "user", content: answer });

    // Hard ceiling, enforced here rather than trusted to the model, exactly
    // as /api/interview/continue enforces it.
    const exchangeCount = history.filter((m) => m.role === "user").length;
    if (exchangeCount >= MAX_EXCHANGES) return history;

    const nextCompletion = await withRetry(`${persona.name} turn ${exchangeCount}`, () =>
      anthropic.messages.create({
        model: INTERVIEW_MODEL,
        max_tokens: 512,
        system: buildInterviewSystemPrompt({ survey, companyProfile: profile, respondent, exchangeCount }),
        messages: [
          { role: "user", content: KICKOFF_MESSAGE },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      })
    );
    const rawReply = textOf(nextCompletion);
    if (!rawReply) throw new Error(`${persona.name}: interviewer produced an empty reply`);

    // Checked against the raw reply, before chip parsing, same as the route.
    // The completion token message is never appended to the transcript, so a
    // finished transcript ends on the respondent's last answer.
    if (rawReply.includes(COMPLETE_TOKEN)) return history;

    const { text: reply } = parseChips(rawReply);
    if (!reply) throw new Error(`${persona.name}: reply was empty after chip parsing`);

    history.push({ role: "assistant", content: reply });
  }
}

// --- Concurrency -----------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// --- Cleanup manifest ------------------------------------------------------

// Slug-specific so two seeded studies never overwrite each other's manifest.
// scripts/seed-cleanup.ts reads exactly this shape.
export type CleanupManifest = {
  slug: string;
  survey_id: string;
  user_id: string;
  response_ids: string[];
  seeded_at: string;
};

export const CLEANUP_DIR = path.join(process.cwd(), "scripts", "seed-cleanup");

export function cleanupManifestPath(slug: string): string {
  return path.join(CLEANUP_DIR, `${slug}.json`);
}

// --- Main ------------------------------------------------------------------

function parseArgs() {
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(`--${name}`);
  const value = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  return {
    create: flag("create"),
    slug: value("slug"),
    count: Number(value("count") ?? "16"),
    concurrency: Number(value("concurrency") ?? "4"),
    notify: flag("notify"),
    reextract: flag("reextract"),
  };
}

// Re-runs extraction over transcripts that are already stored, and rewrites
// only the insight columns. The transcripts are the expensive half of a seed
// run (about twenty model calls each); extraction is one. So when extraction
// is what went wrong, this repairs a seeded study for the cost of one call per
// response instead of re-interviewing sixteen people.
//
// Calls the same extractInterviewInsights the production path calls, with no
// local overrides. If extraction is still failing, this reports that honestly
// rather than papering over it: a row that comes back as the fallback shape is
// counted and named, not written as though it were a real score.
async function reextractStoredTranscripts(
  supabase: ReturnType<typeof createClient<Database>>,
  survey: Survey,
  profile: CompanyProfile | null,
  concurrency: number
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("responses")
    .select("id, respondent_name, messages")
    .eq("survey_id", survey.id)
    .eq("completed", true)
    .order("created_at", { ascending: false });
  if (error) fatal(`responses fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) fatal(`No completed responses on survey ${survey.id}.`);

  heading(`Re-extracting ${rows.length} stored transcripts (concurrency ${concurrency})`);

  const results = await mapWithConcurrency(rows, concurrency, async (row) => {
    const history = (row.messages as unknown as InterviewMessage[] | null) ?? [];
    const insights = await extractInterviewInsights(history, profile);

    // The exact shape lib/interview/extract.ts falls back to when the model
    // never produced a valid tool call: score 5 with nothing else populated.
    const isFallback =
      insights.leadScore === 5 &&
      insights.painPoints.length === 0 &&
      insights.summary === "" &&
      insights.callScript.opener === "" &&
      insights.callScript.talkingPoints.length === 0;

    const { error: updateError } = await supabase
      .from("responses")
      .update({
        pain_points: insights.painPoints as unknown as Json,
        lead_score: insights.leadScore,
        fit_reason: insights.fitReason,
        summary: insights.summary,
        call_script: {
          opener: insights.callScript.opener,
          talking_points: insights.callScript.talkingPoints,
        } as unknown as Json,
        signals: {
          economic_buyer: insights.signals.economicBuyer,
          decision_criteria: insights.signals.decisionCriteria,
          decision_process: insights.signals.decisionProcess,
          metrics: insights.signals.metrics,
          champion: insights.signals.champion,
        } as unknown as Json,
      })
      .eq("id", row.id)
      .eq("survey_id", survey.id);
    if (updateError) throw new Error(`${row.respondent_name}: update failed: ${updateError.message}`);

    console.log(
      `  ${isFallback ? "✗" : "✓"} ${(row.respondent_name ?? row.id).padEnd(26)} ` +
        `score ${String(insights.leadScore).padStart(2)}  ${insights.painPoints.length} pain points` +
        `${isFallback ? "  (FALLBACK, not a real score)" : ""}`
    );

    return { name: row.respondent_name ?? row.id, score: insights.leadScore, isFallback };
  });

  const fallbacks = results.filter((r) => r.isFallback);
  const real = results.filter((r) => !r.isFallback);
  const byScore: Record<number, number> = {};
  for (const r of real) byScore[r.score] = (byScore[r.score] ?? 0) + 1;

  heading("Re-extraction result");
  console.log(`Real extractions:  ${real.length} of ${results.length}`);
  console.log(`Fallbacks:         ${fallbacks.length}${fallbacks.length ? ` (${fallbacks.map((f) => f.name).join(", ")})` : ""}`);
  if (real.length > 0) {
    console.log(`\nScore distribution (real extractions only):`);
    for (const score of Object.keys(byScore).map(Number).sort((a, b) => b - a)) {
      console.log(`  ${String(score).padStart(2)}  ${"█".repeat(byScore[score])} ${byScore[score]}`);
    }
    console.log(`\nScored 7+ (shows in Leads): ${real.filter((r) => r.score >= 7).length} of ${results.length}`);
  }
  console.log("");
}

async function main() {
  const args = parseArgs();

  if (!args.create && !args.slug) {
    fatal(
      "Pass --create to create the study and seed it, or --slug=<slug> to seed against an existing survey.\n" +
        "   npx tsx scripts/seed-responses.ts --create --count=16\n" +
        "   npx tsx scripts/seed-responses.ts --slug=<slug> --reextract"
    );
  }
  if (args.reextract && args.create) {
    fatal("--reextract re-scores transcripts that already exist; it cannot be combined with --create.");
  }
  if (!args.reextract && (!Number.isInteger(args.count) || args.count < 1 || args.count > PERSONAS.length)) {
    fatal(`--count must be an integer between 1 and ${PERSONAS.length} (the number of personas defined).`);
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("ANTHROPIC_API_KEY");

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  heading("Account");
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fatal(`auth.users lookup failed: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL);
    if (hit) userId = hit.id;
    else if (data.users.length < 200) break;
  }
  if (!userId) fatal(`No auth user found for ${OWNER_EMAIL}.`);
  console.log(`${OWNER_EMAIL} -> ${userId}`);

  // surveys.org_id is NOT NULL: the study is stamped with the owner's
  // organization (their first membership, the same one getActiveOrg picks).
  const { data: membership, error: membershipError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) fatal(`org_members lookup failed: ${membershipError.message}`);
  if (!membership) fatal(`${OWNER_EMAIL} has no organization membership.`);
  const orgId = membership.org_id;
  console.log(`  org:           ${orgId}`);

  // --- resolve or create the survey ---
  heading(args.create ? "Creating the study" : "Loading the study");
  let survey: Survey;

  if (args.create) {
    // The app's own slug generator, not a new format: slugify(title) plus the
    // anti-enumeration suffix every public survey URL carries.
    const slug = `${slugify(STUDY.title)}-${randomSlugSuffix()}`;
    const { data, error } = await supabase
      .from("surveys")
      .insert({
        slug,
        title: STUDY.title,
        external_title: STUDY.external_title,
        topic: STUDY.topic,
        sponsor: STUDY.sponsor,
        tone: STUDY.tone,
        num_questions: STUDY.num_questions,
        gift_card_amount: STUDY.gift_card_amount,
        question_guide: STUDY.question_guide,
        custom_fields: STUDY.custom_fields as unknown as Json,
        status: "live",
        // Not the one-click demo dataset: /api/sample-data selects the
        // user's is_sample survey with maybeSingle(), so a second one would
        // break that route, and its DELETE would take this study with it.
        is_sample: false,
        user_id: userId,
        org_id: orgId,
      })
      .select("*")
      .single();
    if (error) fatal(`survey insert failed: ${error.message}`);
    survey = data;
    console.log(`Created survey ${survey.id}`);
  } else {
    const { data, error } = await supabase
      .from("surveys")
      .select("*")
      .eq("slug", args.slug!)
      .maybeSingle();
    if (error) fatal(`survey lookup failed: ${error.message}`);
    if (!data) fatal(`No survey with slug "${args.slug}".`);
    survey = data;
    if (survey.user_id !== userId) {
      fatal(`Survey "${args.slug}" belongs to ${survey.user_id}, not ${OWNER_EMAIL}.`);
    }
    console.log(`Loaded survey ${survey.id}`);
  }

  console.log(`  slug:            ${survey.slug}`);
  console.log(`  title:           ${survey.title}`);
  console.log(`  sponsor:         ${survey.sponsor}`);
  console.log(`  tone:            ${survey.tone}`);
  console.log(`  num_questions:   ${survey.num_questions}`);
  console.log(`  gift_card:       $${survey.gift_card_amount}`);
  console.log(`  status:          ${survey.status}`);
  console.log(`  custom_fields:   ${JSON.stringify(survey.custom_fields)}`);

  // The owner's company profile. Extraction scores fit against THIS, not
  // against surveys.sponsor, which only ever reaches the interviewer prompt.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop, slack_webhook_url")
    .eq("org_id", orgId)
    .maybeSingle();
  const profile: CompanyProfile | null = profileRow
    ? { whatWeSell: profileRow.what_we_sell, targetIcp: profileRow.target_icp, valueProp: profileRow.value_prop }
    : null;
  console.log(`  owner profile:   ${profile ? "loaded (scores fit against it)" : "none"}`);

  if (args.reextract) {
    await reextractStoredTranscripts(supabase, survey, profile, args.concurrency);
    return;
  }

  // --- run the interviews ---
  const chosen = PERSONAS.slice(0, args.count);
  for (const p of chosen) {
    if (p.email.toLowerCase() === OWNER_EMAIL) fatal(`Persona ${p.name} uses the owner address.`);
    const domain = extractEmailDomain(p.email);
    if (!domain || isFreeEmailDomain(domain)) fatal(`Persona ${p.name} has a non-work email: ${p.email}`);
  }

  heading(`Running ${chosen.length} interviews (concurrency ${args.concurrency})`);
  const distribution = chosen.reduce<Record<string, number>>((acc, p) => {
    acc[p.friction] = (acc[p.friction] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Persona friction mix: ${JSON.stringify(distribution)}`);
  console.log(`Notifications: ${args.notify ? "ENABLED (--notify)" : "suppressed (no --notify)"}\n`);

  type Seeded = {
    persona: Persona;
    responseId: string;
    leadScore: number;
    exchanges: number;
    painPoints: string[];
    fitReason: string;
    summary: string;
    callScript: { opener: string; talkingPoints: { said: string; angle: string }[] };
    signals: Record<string, string | null>;
  };

  // The manifest is rewritten after every insert rather than once at the end.
  // A run this long (sixteen interviews, ~350 model calls) can die halfway —
  // rate limits, a network blip, Ctrl-C — and a manifest written only on
  // success would leave those rows with nothing pointing at them. Writing as
  // we go means scripts/seed-cleanup.ts can always remove whatever exists.
  mkdirSync(CLEANUP_DIR, { recursive: true });
  const manifestPath = cleanupManifestPath(survey.slug);
  const insertedIds: string[] = [];
  const writeManifest = () => {
    const manifest: CleanupManifest = {
      slug: survey.slug,
      survey_id: survey.id,
      user_id: userId,
      response_ids: [...insertedIds],
      seeded_at: new Date().toISOString(),
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  };
  // Written before the first interview runs, so even a run that inserts
  // nothing still leaves a manifest that can delete the survey.
  writeManifest();
  console.log(`Cleanup manifest: ${path.relative(process.cwd(), manifestPath)}\n`);

  const started = Date.now();
  const seeded = await mapWithConcurrency(chosen, args.concurrency, async (persona) => {
    const domain = extractEmailDomain(persona.email)!;
    const customFieldValues = {
      ...sanitizeCustomFieldValues({
        job_title: persona.jobTitle,
        custom_company_size: persona.companySize,
        company: persona.company,
      }),
      email_domain: domain,
      derived_company_name: deriveCompanyNameFromDomain(domain),
    };

    const history = await runInterview(survey, profile, persona, customFieldValues);
    const exchanges = history.filter((m) => m.role === "user").length;

    // The real extraction pass. Whatever it returns is what gets written.
    const insights = await extractInterviewInsights(history, profile);

    const createdAt = new Date(Date.now() - persona.daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("responses")
      .insert({
        survey_id: survey.id,
        respondent_name: persona.name,
        respondent_email: persona.email,
        respondent_phone: null,
        custom_field_values: customFieldValues as unknown as Json,
        messages: history as unknown as Json,
        completed: true,
        pain_points: insights.painPoints as unknown as Json,
        lead_score: insights.leadScore,
        fit_reason: insights.fitReason,
        summary: insights.summary,
        call_script: {
          opener: insights.callScript.opener,
          talking_points: insights.callScript.talkingPoints,
        } as unknown as Json,
        signals: {
          economic_buyer: insights.signals.economicBuyer,
          decision_criteria: insights.signals.decisionCriteria,
          decision_process: insights.signals.decisionProcess,
          metrics: insights.signals.metrics,
          champion: insights.signals.champion,
        } as unknown as Json,
        session_token: generateSessionToken(),
        source: "seed",
        // Not test data: the Leads queue hides is_test rows behind a toggle,
        // the survey detail page filters them out, and the report endpoint
        // excludes them. Seeding as test would make all three unexercisable.
        is_test: false,
        user_id: userId,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(`${persona.name}: response insert failed: ${insertError.message}`);

    insertedIds.push(inserted.id);
    writeManifest();

    console.log(
      `  ✓ ${persona.name.padEnd(26)} ${persona.friction.padEnd(6)} ` +
        `${exchanges} exchanges  score ${String(insights.leadScore).padStart(2)}  ` +
        `${insights.painPoints.length} pain points`
    );

    return {
      persona,
      responseId: inserted.id,
      leadScore: insights.leadScore,
      exchanges,
      painPoints: insights.painPoints,
      fitReason: insights.fitReason,
      summary: insights.summary,
      callScript: insights.callScript,
      signals: {
        economic_buyer: insights.signals.economicBuyer,
        decision_criteria: insights.signals.decisionCriteria,
        decision_process: insights.signals.decisionProcess,
        metrics: insights.signals.metrics,
        champion: insights.signals.champion,
      },
    } satisfies Seeded;
  });

  const elapsedMin = ((Date.now() - started) / 60_000).toFixed(1);

  // --- optional notifications, strictly behind --notify ---
  if (args.notify) {
    heading("Notifications (--notify)");
    for (const s of seeded) {
      try {
        const { data: ownerData } = await supabase.auth.admin.getUserById(userId);
        const ownerEmail = ownerData?.user?.email;
        if (ownerEmail) {
          await sendLeadNotification({
            survey: { id: survey.id, title: survey.title },
            respondentName: s.persona.name,
            respondentEmail: s.persona.email,
            leadScore: s.leadScore,
            fitReason: s.fitReason,
            painPoints: s.painPoints,
            ownerEmail,
          });
        }
      } catch (err) {
        console.error(`  email failed for ${s.persona.name}:`, err);
      }

      if (profileRow?.slack_webhook_url) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await sendLeadNotificationToSlack(profileRow.slack_webhook_url, {
          surveyTitle: survey.title,
          respondentName: s.persona.name,
          respondentEmail: s.persona.email,
          respondentPhone: null,
          jobTitle: s.persona.jobTitle,
          company: s.persona.company,
          leadScore: s.leadScore,
          fitScore: null,
          topPainPoint: selectTopPainPoint(s.painPoints),
          callScriptOpener: selectCallScriptOpener(s.callScript),
          completedAt: new Date().toISOString(),
          responseUrl: `${appUrl}/admin/responses/${s.responseId}`,
        });
      }

      await syncResponseToHubSpot({
        supabase,
        responseId: s.responseId,
        surveyTitle: survey.title,
        respondentName: s.persona.name,
        respondentEmail: s.persona.email,
        respondentPhone: null,
        company: s.persona.company,
        leadScore: s.leadScore,
        painPoints: s.painPoints,
        callScript: s.callScript,
        completedAt: new Date().toISOString(),
      });
    }
  }

  // --- report ---
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const scores = seeded.map((s) => s.leadScore).sort((a, b) => b - a);
  const byScore: Record<number, number> = {};
  for (const score of scores) byScore[score] = (byScore[score] ?? 0) + 1;
  const hot = scores.filter((s) => s >= 7).length;

  heading("Result");
  console.log(`Study slug:          ${survey.slug}`);
  console.log(`Survey id:           ${survey.id}`);
  console.log(`Admin URL:           ${appUrl}/admin/surveys/${survey.id}`);
  console.log(`Public survey URL:   ${appUrl}/survey/${survey.slug}`);
  console.log(`Responses inserted:  ${seeded.length} (all completed, is_test=false)`);
  console.log(`Elapsed:             ${elapsedMin} min`);
  console.log(`\nScore distribution (lead_score -> count):`);
  for (const score of Object.keys(byScore).map(Number).sort((a, b) => b - a)) {
    console.log(`  ${String(score).padStart(2)}  ${"█".repeat(byScore[score])} ${byScore[score]}`);
  }
  console.log(`\nScored 7+ (shows in Leads): ${hot} of ${seeded.length}`);
  console.log(`\nPer respondent:`);
  for (const s of [...seeded].sort((a, b) => b.leadScore - a.leadScore)) {
    console.log(
      `  ${String(s.leadScore).padStart(2)}  ${s.persona.name.padEnd(26)} ${s.persona.friction.padEnd(6)} ` +
        `${s.persona.jobTitle}, ${s.persona.company}`
    );
  }
  console.log(`\nCleanup manifest:    ${path.relative(process.cwd(), manifestPath)}`);
  console.log(`Clean up with:       npx tsx scripts/seed-cleanup.ts --slug=${survey.slug} --dry-run`);
  console.log("");
}

// Guarded because scripts/seed-cleanup.ts imports CleanupManifest and
// cleanupManifestPath from this file — importing the seeder must not run it.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
