// Audit measurement: which knobs actually move the ~1.9s opening-question call.
// Read-only, creates no rows. Per the claude-api skill, Sonnet 5 runs ADAPTIVE
// THINKING BY DEFAULT when `thinking` is omitted (a change from Sonnet 4.6),
// and defaults to effort "high" — the start route sets neither.
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
  const { data: survey } = await supabase.from("surveys").select("*").limit(1).maybeSingle();
  if (!survey) throw new Error("no surveys");
  const { data: profile } = await supabase
    .from("profiles").select("what_we_sell, target_icp, value_prop")
    .eq("user_id", survey.user_id).maybeSingle();

  const respondent = { name: "Test Respondent", customFieldValues: {} };
  const systemPrompt = buildInterviewSystemPrompt({
    survey,
    companyProfile: profile
      ? { whatWeSell: profile.what_we_sell, targetIcp: profile.target_icp, valueProp: profile.value_prop }
      : null,
    respondent,
    exchangeCount: 0,
  });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const kickoff = buildKickoffMessage(respondent);

  const variants: { label: string; extra: Record<string, unknown> }[] = [
    { label: "current (no thinking/effort set)", extra: {} },
    { label: "effort=low", extra: { output_config: { effort: "low" } } },
    { label: "thinking=disabled", extra: { thinking: { type: "disabled" } } },
    { label: "thinking=disabled + effort=low", extra: { thinking: { type: "disabled" }, output_config: { effort: "low" } } },
    // Prompt caching: system as a cached block. First call writes, rest read.
    { label: "cached system prompt", extra: {} },
  ];

  for (const v of variants) {
    const runs: number[] = [];
    let lastUsage: Record<string, unknown> = {};
    const cached = v.label === "cached system prompt";
    for (let i = 0; i < 3; i++) {
      const t = process.hrtime.bigint();
      const c = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 512,
        system: cached
          ? [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]
          : systemPrompt,
        messages: [{ role: "user", content: kickoff }],
        ...v.extra,
      } as never);
      runs.push(ms(t));
      lastUsage = c.usage as unknown as Record<string, unknown>;
    }
    const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
    console.log(
      `${v.label.padEnd(34)} avg ${avg.toFixed(0).padStart(5)} ms   ` +
      `runs [${runs.map((r) => r.toFixed(0)).join(", ")}]   ` +
      `out=${lastUsage.output_tokens} in=${lastUsage.input_tokens} ` +
      `cw=${lastUsage.cache_creation_input_tokens ?? 0} cr=${lastUsage.cache_read_input_tokens ?? 0}`
    );
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
