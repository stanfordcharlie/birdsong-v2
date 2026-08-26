// Throwaway measurement for the "Preview interview" latency audit.
// Times the two server-side terms of POST /api/interview/start against a
// representative survey: the Supabase reads and the Anthropic opening-question
// call. Read-only — creates no rows.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { buildInterviewSystemPrompt, buildKickoffMessage } from "../lib/interview-prompt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ms = (t: bigint) => Number(process.hrtime.bigint() - t) / 1e6;

async function main() {
  // Pick any survey to stand in for the previewed one.
  const t0 = process.hrtime.bigint();
  const { data: survey } = await supabase.from("surveys").select("*").limit(1).maybeSingle();
  const surveyMs = ms(t0);
  if (!survey) throw new Error("no surveys in this database");

  const t1 = process.hrtime.bigint();
  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", survey.user_id)
    .maybeSingle();
  const profileMs = ms(t1);

  const respondent = { name: "Test Respondent", customFieldValues: {} };
  const systemPrompt = buildInterviewSystemPrompt({
    survey,
    companyProfile: profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null,
    respondent,
    exchangeCount: 0,
  });

  console.log(`survey: "${survey.title}"  status=${survey.status}`);
  console.log(`system prompt: ${systemPrompt.length} chars (~${Math.round(systemPrompt.length / 3.6)} tokens)`);
  console.log(`\nsupabase surveys select("*") : ${surveyMs.toFixed(0)} ms`);
  console.log(`supabase profiles select     : ${profileMs.toFixed(0)} ms`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const runs: number[] = [];
  for (let i = 0; i < 4; i++) {
    const t = process.hrtime.bigint();
    const c = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: buildKickoffMessage(respondent) }],
    });
    const took = ms(t);
    runs.push(took);
    const out = c.usage.output_tokens;
    console.log(`anthropic run ${i + 1}: ${took.toFixed(0)} ms   (in ${c.usage.input_tokens} tok, out ${out} tok)`);
  }
  const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
  console.log(`\nanthropic avg: ${avg.toFixed(0)} ms   min ${Math.min(...runs).toFixed(0)}  max ${Math.max(...runs).toFixed(0)}`);
  console.log(`server-side total (sequential): ~${(surveyMs + profileMs + avg).toFixed(0)} ms`);
}

main().catch((e) => { console.error(e); process.exit(1); });
