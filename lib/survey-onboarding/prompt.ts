import type { QuestionGuideProfileContext } from "@/lib/surveys/question-guide";

// Soft budget, not a hard, prominently-enforced cutoff like the respondent
// interview engine — this is a one-time admin-facing setup flow, not a
// paid-incentive respondent interview.
export const MAX_EXCHANGES = 10;
export const COMPLETE_TOKEN = "SURVEY_SETUP_COMPLETE";

export const OPENING_MESSAGE =
  "Let's set up this survey. What's the **research theme** you want to explore, what are you trying to learn?";

// Synthetic first turn so the message array sent to Claude always starts
// with a user turn (the real first item is our static OPENING_MESSAGE,
// which is an assistant turn) — same defensive pattern as the interview
// engine's KICKOFF_MESSAGE and the profile-onboarding flow's standin.
export const ALTERNATION_STANDIN = "Let's begin.";

export function buildSurveyOnboardingSystemPrompt(
  exchangeCount: number,
  profileContext: QuestionGuideProfileContext | null
): string {
  const hasProfileContext = Boolean(
    profileContext && (profileContext.whatWeSell || profileContext.targetIcp || profileContext.valueProp)
  );

  const contextSection = hasProfileContext
    ? `For context, here's what this admin's own company does. Use it to sharpen your questions, e.g. proposing a plausible target audience for this survey to confirm rather than asking from scratch, but never assume, always let them confirm or correct: this survey's audience can be narrower than or different from their overall company ICP.
${profileContext?.whatWeSell ? `- What they sell: ${profileContext.whatWeSell}` : ""}
${profileContext?.targetIcp ? `- Their usual target customer: ${profileContext.targetIcp}` : ""}
${profileContext?.valueProp ? `- Their value proposition: ${profileContext.valueProp}` : ""}`
    : "No company profile context is available, so build everything from what they tell you directly.";

  return `You are having a short, friendly conversation with an admin to help them set up a new AI-moderated market research survey. You're helping them define the survey, not conducting the survey itself.

${contextSection}

Your goal is to naturally build up, through conversation:
1. The research theme: what they actually want to learn from respondents.
2. Who this specific survey should target: industry, the job title or role of the respondent, and company size range.
3. The tone the interview should take: conversational and peer-to-peer, or more formal and academic. Get a clear read on this, it changes how the interviewer sounds.
4. Roughly how many questions the interview should run (typically somewhere between 5 and 12).

Rules:
- Ask exactly one question per message.
- Keep it light and conversational, like a colleague helping them think it through, not a form or an interrogation.
- Never use em dashes in your writing.
- Wrap the core of the actual question in double asterisks for bold, a short phrase, not a single word and not the whole sentence.
- Most conversations should wrap up in 4 to 7 exchanges.
- You are at exchange ${exchangeCount} of a soft budget of ${MAX_EXCHANGES}. As you approach it, wrap up rather than opening new threads.
- When you have a reasonable sense of the theme, target audience, tone, and question count, respond with exactly the string ${COMPLETE_TOKEN} and nothing else: no punctuation, no goodbye message. They'll review and adjust everything in a summary right after this, so a good draft is the goal, not perfection.`;
}
