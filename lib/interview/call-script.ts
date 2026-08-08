// The call script as stored on responses.call_script, in both shapes it can
// take on disk.
//
// Talking points used to be a flat string[] and are now {said, angle} pairs:
// the respondent's own words next to the angle a rep should take on them (the
// "They said / Your angle" treatment on the response detail page). Rows
// extracted before that change still hold plain strings, and there is no
// backfill because the quote simply isn't recoverable from a bridged
// sentence. So both shapes are parsed here, once, and every reader goes
// through this module rather than re-deriving the union at each call site.
//
// A legacy point becomes {said: "", angle: <the string>}: `said` empty is the
// signal that there is no quote to show, and the UI falls back to rendering
// that point as a plain line instead of a paired row.

export type TalkingPoint = {
  /** The respondent's own words. Empty for points stored before pairing. */
  said: string;
  /** How the rep should bridge from that to what the sponsor sells. */
  angle: string;
};

export type CallScript = {
  opener: string;
  talkingPoints: TalkingPoint[];
};

export function isPairedPoint(point: TalkingPoint): boolean {
  return point.said.trim().length > 0;
}

function parseTalkingPoint(raw: unknown): TalkingPoint | null {
  // Legacy: the whole point was one bridged sentence, with no quote.
  if (typeof raw === "string") {
    const angle = raw.trim();
    return angle ? { said: "", angle } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const { said, angle } = raw as { said?: unknown; angle?: unknown };
  const parsedAngle = typeof angle === "string" ? angle.trim() : "";
  // The angle is the part a rep actually says, so a point without one is
  // nothing worth rendering; a missing quote is merely a degraded point.
  if (!parsedAngle) return null;
  return {
    said: typeof said === "string" ? said.trim() : "",
    angle: parsedAngle,
  };
}

export function parseCallScript(raw: unknown): CallScript | null {
  if (!raw || typeof raw !== "object") return null;
  const { opener, talking_points: talkingPoints } = raw as {
    opener?: unknown;
    talking_points?: unknown;
  };
  const parsed: CallScript = {
    opener: typeof opener === "string" ? opener.trim() : "",
    talkingPoints: Array.isArray(talkingPoints)
      ? talkingPoints.map(parseTalkingPoint).filter((p): p is TalkingPoint => p !== null)
      : [],
  };
  if (!parsed.opener && parsed.talkingPoints.length === 0) return null;
  return parsed;
}

// What the Copy button puts on the clipboard. Plain text, since it's pasted
// into a CRM note or a dialer, so the quote is labelled rather than styled.
export function callScriptToText(script: CallScript): string {
  const lines: string[] = [];
  if (script.opener) {
    lines.push("OPENER", script.opener);
  }
  if (script.talkingPoints.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("TALKING POINTS");
    script.talkingPoints.forEach((point, i) => {
      lines.push(
        isPairedPoint(point)
          ? `${i + 1}. They said: "${point.said}" / ${point.angle}`
          : `${i + 1}. ${point.angle}`
      );
    });
  }
  return lines.join("\n");
}
