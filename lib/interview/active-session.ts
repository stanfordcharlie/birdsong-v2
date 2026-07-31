// The per-tab pointer that lets a refreshed or backgrounded tab rejoin an
// interview already in progress. Pure string handling, no storage access, so
// the validation rules are testable on their own; InterviewFlow owns the
// actual sessionStorage reads and writes.

export type ActiveInterviewSession = {
  responseId: string;
  token: string;
  surveyId: string;
};

export function activeSessionStorageKey(surveyId: string): string {
  return `birdsong-interview-active:${surveyId}`;
}

export function serializeActiveSession(session: ActiveInterviewSession): string {
  return JSON.stringify(session);
}

// Returns null for anything that is not a complete pointer for THIS survey:
// unparseable JSON, a missing field, or a pointer left behind by a different
// survey under a shared key. A null here always means "start fresh", never
// "show an error".
export function parseActiveSession(raw: string | null, surveyId: string): ActiveInterviewSession | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { responseId, token, surveyId: storedSurveyId } = parsed as Record<string, unknown>;
  if (typeof responseId !== "string" || !responseId) return null;
  if (typeof token !== "string" || !token) return null;
  if (typeof storedSurveyId !== "string" || storedSurveyId !== surveyId) return null;
  return { responseId, token, surveyId: storedSurveyId };
}
