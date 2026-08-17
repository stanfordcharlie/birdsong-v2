// Content assembly shared by every consumer of a completed interview: the
// Slack notification, the HubSpot contact sync, and anything that follows.
//
// These three selections used to be written inline at the notification call
// site in app/api/interview/continue/route.ts. Once HubSpot needed the same
// pain point and the same call script opener, inline meant two independent
// notions of "the top pain point" that could quietly drift apart, so they live
// here instead. Pure functions over already-extracted insights: no formatting
// decisions belonging to one destination leak in.
//
// Presentation is deliberately NOT here. Slack truncates the opener to a
// single line and 220 characters because Block Kit sections are a preview
// surface, and that stays inside lib/slack/lead-notification.ts. A HubSpot
// textarea is not a preview surface, so it gets the whole opener.

export function selectTopPainPoint(painPoints: string[]): string | null {
  const top = painPoints[0];
  return typeof top === "string" && top.trim() ? top.trim() : null;
}

// Null rather than "" for an interview that produced no usable opener, so
// callers can drop the field entirely instead of writing an empty one.
export function selectCallScriptOpener(callScript: { opener: string } | null): string | null {
  return callScript?.opener.trim() || null;
}

// Every pain point, one per line, for destinations with room for the full set
// (a HubSpot textarea) rather than just the top one. Blank entries are
// dropped so the field never ends up with a dangling bullet.
export function formatPainPointList(painPoints: string[]): string | null {
  const lines = painPoints
    .filter((point): point is string => typeof point === "string")
    .map((point) => point.trim())
    .filter(Boolean)
    .map((point) => `- ${point}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

// The respondent's employer, which the interview may have collected directly
// ("company") or derived from their email domain ("derived_company_name").
//
// app/api/interview/continue/route.ts still has its own inline copy of this:
// that copy sits upstream of the completion write, on the path that returns
// the respondent's final message, and is left exactly as it is. This one
// serves the paths that read a stored response row later, notably the manual
// HubSpot re-sync from the admin detail page.
export function selectRespondentCompanyName(
  customFieldValues: Record<string, unknown> | null
): string | null {
  const values = customFieldValues ?? {};
  if (typeof values.company === "string" && values.company.trim()) return values.company.trim();
  if (typeof values.derived_company_name === "string" && values.derived_company_name.trim()) {
    return values.derived_company_name.trim();
  }
  return null;
}
