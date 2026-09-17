/**
 * Phase 3 verification, part one: run the brief chat end to end against the
 * real prompts, extraction, termination logic, generator and critic.
 *
 * The admin side of the conversation is played by a second Claude call with
 * a fixed persona, so the transcript is a plausible study rather than
 * scripted answers that happen to satisfy the extractor.
 *
 * Writes the whole run to scratch as JSON for the later steps.
 */
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { extractBrief } from "../../lib/brief/extract";
import {
  ALTERNATION_STANDIN,
  MAX_EXCHANGES,
  OPENING_MESSAGE,
  buildBriefSystemPrompt,
} from "../../lib/brief/prompt";
import { isBriefComplete, missingBriefFields, type BriefMessage, type ExtractedBrief } from "../../lib/brief/types";
import { generateGuide } from "../../lib/brief/generate";
import { runCriticPass } from "../../lib/brief/critic";
import { renderGuideToText } from "../../lib/surveys/guide";
import type { QuestionGuideProfileContext } from "../../lib/surveys/question-guide";

const OUT = process.argv[2] ?? "/tmp/brief-run.json";
const MODEL = "claude-sonnet-5";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Stands in for the signed-in admin's Company Profile.
const PROFILE: QuestionGuideProfileContext = {
  whatWeSell: "Field service scheduling and dispatch software for commercial HVAC contractors",
  targetIcp: "Operations managers at commercial HVAC contractors running 15 to 80 technicians",
  valueProp: "Cut the time between an emergency call landing and a technician being on the road",
};

const ADMIN_PERSONA = `You are the VP of Marketing at a company that sells field service scheduling and dispatch software to commercial HVAC contractors. You are talking to a research platform's setup assistant, which is helping you commission research interviews with your market.

Answer its questions the way a real busy marketing leader would: short, a bit loose, occasionally vague on the first pass. Do not write essays and do not volunteer everything at once. One or two sentences per reply.

Your actual situation, to draw on as it becomes relevant:
- You sell to operations managers and dispatch supervisors at commercial HVAC contractors, roughly 15 to 80 technicians.
- You want to know how these teams actually handle emergency and after-hours calls, because you think most of them are doing it with a whiteboard and a phone tree and you cannot prove it.
- Someone is worth a sales conversation to you if they are running more than about 20 technicians and someone on their team is manually rerouting jobs during the day.

Reply with only your message, nothing else.`;

async function adminReply(messages: BriefMessage[]): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "You"}: ${m.content}`)
    .join("\n\n");
  const result = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: ADMIN_PERSONA,
    messages: [{ role: "user", content: `${transcript}\n\nYou:` }],
  });
  return result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Mirrors app/api/surveys/brief/continue exactly. */
async function briefTurn(
  messages: BriefMessage[],
  known: Partial<ExtractedBrief>
): Promise<{ complete: true; brief: ExtractedBrief; closing: string } | { complete: false; message: string }> {
  const exchangeCount = messages.filter((m) => m.role === "user").length;
  const extracted = await extractBrief(messages);
  const brief = (Object.keys(extracted) as (keyof ExtractedBrief)[]).reduce(
    (acc, field) => {
      acc[field] = extracted[field] || (known[field] ?? "").trim();
      return acc;
    },
    { ...extracted }
  );

  if (isBriefComplete(brief) || exchangeCount >= MAX_EXCHANGES) {
    return { complete: true, brief, closing: "That's what I need. Drafting the research guide now." };
  }

  const completion = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: buildBriefSystemPrompt({
      exchangeCount,
      missing: missingBriefFields(brief) as (keyof ExtractedBrief)[],
      profile: PROFILE,
    }),
    messages: [
      { role: "user", content: ALTERNATION_STANDIN },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return {
    complete: false,
    message: completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim(),
  };
}

async function main() {
  // The wizard collects the sponsor on the step before the chat opens.
  const known: Partial<ExtractedBrief> = { sponsorName: "Cadence Field Systems" };

  let messages: BriefMessage[] = [{ role: "assistant", content: OPENING_MESSAGE }];
  let brief: ExtractedBrief | null = null;

  console.log(`ASSISTANT: ${OPENING_MESSAGE}\n`);

  for (let i = 0; i < MAX_EXCHANGES + 2; i++) {
    const answer = await adminReply(messages);
    messages = [...messages, { role: "user", content: answer }];
    console.log(`ADMIN: ${answer}\n`);

    const turn = await briefTurn(messages, known);
    if (turn.complete) {
      messages = [...messages, { role: "assistant", content: turn.closing }];
      brief = turn.brief;
      console.log(`ASSISTANT: ${turn.closing}\n`);
      break;
    }
    messages = [...messages, { role: "assistant", content: turn.message }];
    console.log(`ASSISTANT: ${turn.message}\n`);
  }

  if (!brief) throw new Error("Brief never terminated");

  console.log("=== EXCHANGES ===");
  console.log(messages.filter((m) => m.role === "user").length);
  console.log("\n=== EXTRACTED BRIEF ===");
  console.log(JSON.stringify(brief, null, 2));

  console.log("\n=== GENERATING ===");
  const draft = await generateGuide({ brief, profile: PROFILE });
  const { guide, report } = await runCriticPass({ brief, profile: PROFILE, guide: draft });

  writeFileSync(
    OUT,
    JSON.stringify({ transcript: messages, brief, draft, guide, report, profile: PROFILE }, null, 2)
  );
  console.log(`\nWrote ${OUT}`);
  console.log("\n=== DERIVED question_guide TEXT ===");
  console.log(renderGuideToText(guide));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
