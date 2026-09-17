/**
 * Phase 3 verification, part two: create a study from the generated guide
 * exactly the way the wizard does, then run a real interview against it
 * through the public interview routes, and do the same against a study that
 * predates the migration.
 *
 * Nothing here is a stub: the study row is written with the same payload
 * shape createSurvey builds, and the interview goes over HTTP to the running
 * dev server, so lib/interview-prompt.ts reads question_guide off the
 * database itself.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { renderGuideToText, type StructuredGuide } from "../../lib/surveys/guide";
import type { ExtractedBrief } from "../../lib/brief/types";
import type { BriefMessage } from "../../lib/brief/types";

const RUN = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:3000";
const TURNS = Number(process.argv[4] ?? 4);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const RESPONDENT_PERSONA = `You are an operations manager at a commercial HVAC contractor with about 40 technicians. You are in a short research conversation. Answer like a real person on a call: concrete, a bit rambling, specific details and names of things, two to four sentences. Never ask the interviewer questions. Reply with only your answer.`;

async function respondentReply(question: string, history: string[]): Promise<string> {
  const result = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system: RESPONDENT_PERSONA,
    messages: [
      {
        role: "user",
        content: `${history.join("\n\n")}\n\nInterviewer: ${question}\n\nYou:`,
      },
    ],
  });
  return result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function runInterview(surveyId: string, label: string) {
  console.log(`\n${"=".repeat(70)}\nINTERVIEW: ${label}\nsurvey_id: ${surveyId}\n${"=".repeat(70)}`);

  const startRes = await fetch(`${BASE}/api/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      survey_id: surveyId,
      respondent_name: "Dana Whitfield",
      respondent_email: `dana.whitfield+${Date.now()}@northlinemechanical.com`,
      is_test: true,
    }),
  });
  const start = await startRes.json();
  if (!startRes.ok) {
    console.error("START FAILED", startRes.status, start);
    return null;
  }

  const responseId: string = start.response_id;
  const token: string | undefined = start.token;
  let question: string = start.message;
  const history: string[] = [];

  console.log(`\nMODERATOR Q1: ${question}`);
  if (start.chips) console.log(`  chips: ${JSON.stringify(start.chips)}`);

  for (let i = 0; i < TURNS; i++) {
    const answer = await respondentReply(question, history);
    console.log(`\nRESPONDENT: ${answer}`);
    history.push(`Interviewer: ${question}`, `You: ${answer}`);

    const res = await fetch(`${BASE}/api/interview/continue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_id: responseId, message: answer, token }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("CONTINUE FAILED", res.status, data);
      return responseId;
    }
    if (data.complete) {
      console.log("\nMODERATOR: interview complete");
      break;
    }
    question = data.message;
    console.log(`\nMODERATOR Q${i + 2}: ${question}`);
    if (data.chips) console.log(`  chips: ${JSON.stringify(data.chips)}`);
  }

  return responseId;
}

async function main() {
  const run = JSON.parse(readFileSync(RUN, "utf8")) as {
    brief: ExtractedBrief;
    guide: StructuredGuide;
    transcript: BriefMessage[];
  };

  // Owner: any existing account and its org, so the row passes both the
  // user_id FK and the NOT NULL org_id.
  const { data: owner } = await admin.from("surveys").select("user_id, org_id").limit(1).single();
  const userId = owner!.user_id;
  const orgId = owner!.org_id;

  const questionGuide = renderGuideToText(run.guide);
  const slug = `verify-brief-${Date.now().toString(36)}`;

  // The same payload shape NewSurveyWizard.createSurvey builds.
  const { data: created, error } = await admin
    .from("surveys")
    .insert({
      slug,
      title: "VERIFY brief-generated guide",
      external_title: run.guide.recommended_title,
      sponsor: run.brief.sponsorName,
      public_description: run.brief.publicTopic,
      topic: run.guide.recommended_topic,
      target_industry: run.brief.icpIndustry,
      target_job_title: run.brief.icpRoles,
      target_company_size: run.brief.icpCompanyProfile,
      guide_structured: run.guide as never,
      question_guide: questionGuide,
      brief_transcript: run.transcript as never,
      qualification_criteria: run.brief.qualificationCriteria,
      tone: "Conversational",
      num_questions: run.guide.themes.length,
      custom_fields: [],
      is_sample: false,
      user_id: userId,
      org_id: orgId,
    })
    .select("id, slug, question_guide, guide_structured, brief_transcript, qualification_criteria")
    .single();

  if (error) throw error;

  console.log("CREATED STUDY", created.id, created.slug);
  console.log("  question_guide length:", created.question_guide?.length);
  console.log("  guide_structured themes:", (created.guide_structured as StructuredGuide).themes.length);
  console.log("  brief_transcript messages:", (created.brief_transcript as unknown[]).length);
  console.log("  qualification_criteria:", created.qualification_criteria);

  await runInterview(created.id, "NEW study, derived text guide from structured guide");

  // A study that predates the migration: guide_structured is null and
  // question_guide is the old free-text shape.
  const { data: legacy } = await admin
    .from("surveys")
    .select("id, title, question_guide, guide_structured")
    .is("guide_structured", null)
    .not("question_guide", "is", null)
    .neq("id", created.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!legacy) {
    console.log("\nNo pre-migration study found to test against.");
    return;
  }

  console.log(`\nPRE-MIGRATION STUDY: ${legacy.title}`);
  console.log(`  guide_structured: ${legacy.guide_structured}`);
  console.log(`  question_guide starts: ${legacy.question_guide?.slice(0, 100)}...`);
  await runInterview(legacy.id, `PRE-MIGRATION study "${legacy.title}", free-text guide untouched`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
