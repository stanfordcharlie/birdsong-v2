import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuestionGuide } from "@/lib/surveys/question-guide";

// POST /api/surveys/question-guide
// Body: { title?, topic?, tone?, existing_guide? }
// Admin-only: generates or improves a survey's question guide with Claude,
// using the survey's subject as the primary driver and the admin's own
// company profile (what they sell / target ICP / value prop, fetched
// server-side) as supporting context to sharpen the angles.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: {
    title?: string;
    topic?: string;
    tone?: string;
    existing_guide?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, topic, tone, existing_guide } = body;

  if (!title && !topic) {
    return NextResponse.json({ error: "Give the survey a title or topic first" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const guide = await generateQuestionGuide({
      title,
      topic,
      tone,
      existingGuide: existing_guide,
      profile: profile
        ? {
            whatWeSell: profile.what_we_sell,
            targetIcp: profile.target_icp,
            valueProp: profile.value_prop,
          }
        : null,
    });
    return NextResponse.json({ question_guide: guide });
  } catch {
    return NextResponse.json({ error: "Failed to generate a question guide" }, { status: 502 });
  }
}
