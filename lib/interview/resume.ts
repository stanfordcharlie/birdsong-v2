import type { InterviewMessage } from "./types";

// Pure helpers behind /api/interview/resume. Kept out of the route so the
// sanitizing rules that decide what a respondent's browser is allowed to see
// can be tested directly, without standing up a request.

// The stored transcript is a jsonb column, so it can hold anything a past
// version of this app (or a future bug) put there. This rebuilds it as a
// fresh array of exactly two fields per message: nothing else on a stored
// message object survives, so an internal field added to the transcript
// shape later cannot leak by default. Malformed entries are dropped rather
// than repaired, since a half-parsed question is worse than a shorter
// transcript.
export function toPublicTranscript(raw: unknown): InterviewMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: InterviewMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content) continue;
    messages.push({ role, content });
  }
  return messages;
}

// Position of the interviewer's most recent turn, or -1 when it has none.
// That turn is the question a restored chat stage puts back on screen.
export function lastAssistantIndex(messages: InterviewMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return i;
  }
  return -1;
}

// The last thing the interviewer said. Empty string when the transcript has
// no assistant turn at all, which the route treats as nothing to resume into.
export function lastAssistantContent(messages: InterviewMessage[]): string {
  const index = lastAssistantIndex(messages);
  return index === -1 ? "" : messages[index].content;
}

// Rewrites the interviewer's last turn to `content`, leaving every other
// message untouched. Used when the stored question still had a raw chip
// block on it: the delimiter is parsed off before the transcript is handed
// to the browser, since a respondent must never see it.
export function withLastAssistantContent(
  messages: InterviewMessage[],
  content: string
): InterviewMessage[] {
  const index = lastAssistantIndex(messages);
  if (index === -1) return messages;
  return messages.map((message, i) => (i === index ? { role: message.role, content } : message));
}
