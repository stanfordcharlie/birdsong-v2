// Ephemeral "who is in an interview right now" state.
//
// This is carried entirely by Supabase Realtime Presence: nothing here is
// written to Postgres, there is no table behind it, and the state vanishes
// when the respondent's socket closes. It exists only so the admin Live page
// can watch interviews as they happen.
//
// One channel per survey (rather than one global channel) so an admin only
// ever subscribes to their own surveys' channels, and so a respondent's
// payload never travels to anyone watching a different survey. Note that
// Realtime channels are public by default, so anyone holding the anon key
// and a survey id could join the channel and read presence state. Keep the
// payload below to the minimum the admin view needs, and never put contact
// details (email, phone) or answer content on it.

export type SurveyPresence = {
  response_id: string;
  slug: string;
  respondent_name: string | null;
  // How many questions the interviewer has asked so far, i.e. the count of
  // assistant messages in the transcript. Not a fixed denominator: the model
  // can genuinely run past a survey's num_questions (a soft target, not a
  // cap), which the admin view accounts for when it renders "4 of 8".
  current_step: number;
  // ISO timestamp, refreshed on every heartbeat and on every step change.
  // A stale value means the tab stopped beating (backgrounded, asleep,
  // network dropped), not necessarily that the respondent left.
  last_active: string;
};

export function surveyPresenceChannel(surveyId: string): string {
  return `survey-presence:${surveyId}`;
}

// How often a respondent's tab refreshes last_active while the interview is
// open, and how long the admin view waits before calling an entry inactive.
// The gap between the two is deliberate: one missed beat should not flip a
// row's status, since Presence reconnects can briefly stall a heartbeat.
export const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_STALE_MS = 30_000;

// Presence state arrives as untyped JSON from other clients, so every entry
// is validated before it reaches the UI rather than being cast.
export function isSurveyPresence(value: unknown): value is SurveyPresence {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.response_id === "string" &&
    typeof entry.slug === "string" &&
    (entry.respondent_name === null || typeof entry.respondent_name === "string") &&
    typeof entry.current_step === "number" &&
    typeof entry.last_active === "string"
  );
}
