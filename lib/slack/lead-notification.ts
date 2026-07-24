// Slack incoming-webhook notifications: a second, independent consumer of
// the same completion event that triggers the lead notification email
// (lib/email/lead-notification.ts). Never allowed to affect completion or
// the email path — see sendLeadNotificationToSlack below.

export const SLACK_WEBHOOK_URL_PREFIX = "https://hooks.slack.com/";

export function isValidSlackWebhookUrl(url: string): boolean {
  if (!url.startsWith(SLACK_WEBHOOK_URL_PREFIX)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const SLACK_FETCH_TIMEOUT_MS = 5000;
const PAIN_POINT_MAX_LENGTH = 220;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}...`;
}

function firstLine(text: string): string {
  return text.split("\n")[0].trim();
}

function minutesAgo(completedAtIso: string): number {
  const ms = Date.now() - new Date(completedAtIso).getTime();
  return Math.max(0, Math.round(ms / 60_000));
}

export type LeadNotificationFields = {
  surveyTitle: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  jobTitle: string | null;
  company: string | null;
  leadScore: number;
  // Company fit-scoring agent's score column. Pass null when unscored,
  // unavailable, or the column doesn't exist yet on this database — the
  // "Fit X/10" context fragment is simply omitted in that case.
  fitScore: number | null;
  topPainPoint: string | null;
  // First line of the generated call script's opener. Pass null (or "") if
  // extraction hasn't produced a script yet — the "Opener:" line is omitted.
  callScriptOpener: string | null;
  // ISO timestamp of interview completion — NOT of message send time, which
  // can lag slightly behind (email send + fire-and-forget queuing happen
  // first). "Completed X min ago" is computed against this, not against
  // whenever the message happens to be built.
  completedAt: string;
  responseUrl: string;
};

export type SlackMessage = { text: string; blocks: Record<string, unknown>[] };

// Score tiers gate whether a lead reaches Slack at all — below
// STRONG_LEAD_SCORE_MIN, buildBlocks returns null and nothing is posted.
// Scoring, script generation, and saving/emailing the lead are all
// unaffected; this is a Slack-notification-only cutoff.
const HOT_LEAD_SCORE_MIN = 9;
const STRONG_LEAD_SCORE_MIN = 7;

function scoreTier(score: number): { emoji: string; label: string } | null {
  if (score >= HOT_LEAD_SCORE_MIN) return { emoji: "🔥 ", label: "Hot lead" };
  if (score >= STRONG_LEAD_SCORE_MIN) return { emoji: "", label: "Strong lead" };
  return null;
}

// Returns null for any lead scoring below STRONG_LEAD_SCORE_MIN — callers
// must treat null as "don't send," not as an error.
function buildBlocks(fields: LeadNotificationFields, testLabel: boolean): SlackMessage | null {
  const tier = scoreTier(fields.leadScore);
  if (!tier) return null;

  const name = fields.respondentName?.trim() || "Anonymous respondent";
  const company = fields.company?.trim() || "Company not provided";
  const headerText = truncate(`${tier.emoji}${tier.label} (${fields.leadScore}/10): ${name} at ${company}`, 150);

  const blocks: Record<string, unknown>[] = [];

  if (testLabel) {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: "This is a test notification from Birdsong. No action needed." },
      ],
    });
  }

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: headerText, emoji: false },
  });

  // Context line: job title, fit score, and time-since-completion, joined
  // with " · " — any field that's null (no job title collected, fit
  // scoring hasn't run/isn't available) is dropped rather than shown blank.
  // "Completed" is always present since we always know the completion time.
  const contextParts = [
    fields.jobTitle?.trim() || null,
    fields.fitScore !== null ? `Fit ${fields.fitScore}/10` : null,
    `Completed ${minutesAgo(fields.completedAt)} min ago`,
  ].filter((part): part is string => Boolean(part));
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: contextParts.join(" · ") }],
  });

  if (fields.topPainPoint) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `> ${truncate(fields.topPainPoint, PAIN_POINT_MAX_LENGTH)}` },
    });
  }

  if (fields.callScriptOpener?.trim()) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Opener:* ${truncate(firstLine(fields.callScriptOpener), PAIN_POINT_MAX_LENGTH)}`,
      },
    });
  }

  const contactFields: Record<string, unknown>[] = [];
  if (fields.respondentEmail?.trim()) {
    contactFields.push({
      type: "mrkdwn",
      text: `*Email*\n<mailto:${fields.respondentEmail}|${fields.respondentEmail}>`,
    });
  }
  if (fields.respondentPhone?.trim()) {
    contactFields.push({ type: "mrkdwn", text: `*Phone*\n${fields.respondentPhone}` });
  }
  if (contactFields.length > 0) {
    blocks.push({ type: "section", fields: contactFields });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View response", emoji: false },
        url: fields.responseUrl,
        style: "primary",
      },
    ],
  });

  // Survey name as small context text at the bottom, replacing the old
  // "New lead: [survey]" header title.
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: fields.surveyTitle }],
  });

  return {
    text: `${tier.emoji}${tier.label} (${fields.leadScore}/10): ${name} at ${company}`,
    blocks,
  };
}

// Returns null when the lead scores below the Slack-worthy threshold —
// callers must not post anything in that case (see sendLeadNotificationToSlack).
export function buildLeadNotificationMessage(fields: LeadNotificationFields): SlackMessage | null {
  return buildBlocks(fields, false);
}

// Fixed, self-contained sample lead for the settings page's "Send test
// notification" button, clearly labeled so it's never mistaken for a real
// one. Links to the leads queue rather than a specific response, since
// there's no real response backing it.
export function buildSampleNotificationMessage(appUrl: string): SlackMessage {
  const message = buildBlocks(
    {
      surveyTitle: "Sample survey",
      respondentName: "Jordan Lee",
      respondentEmail: "jordan.lee@acme.com",
      respondentPhone: "+1 555-0100",
      jobTitle: "VP of Operations",
      company: "Acme Corp",
      leadScore: 9,
      fitScore: 8,
      topPainPoint:
        "Our team spends hours every week manually reconciling spreadsheets before dispatch can even start.",
      callScriptOpener:
        "You mentioned your team burns hours every week reconciling spreadsheets by hand before dispatch can even start — that's exactly the manual handoff our platform automates away.",
      completedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
      responseUrl: `${appUrl}/admin/leads`,
    },
    true
  );
  // Sample data is fixed at a 9/10 score, always above the Slack-worthy
  // threshold, so buildBlocks never returns null here.
  return message as SlackMessage;
}

// Low-level, awaited send: used directly by the settings page's test button
// (which needs the result to show success/failure inline) and wrapped by
// sendLeadNotificationToSlack below for the fire-and-forget completion path.
export async function postSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<{ ok: true } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SLACK_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const error = `Slack returned ${res.status}${body ? `: ${body}` : ""}`;
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const error =
      err instanceof Error && err.name === "AbortError"
        ? "Slack webhook request timed out"
        : err instanceof Error
          ? err.message
          : "Unknown error posting to Slack";
    return { ok: false, error };
  } finally {
    clearTimeout(timeout);
  }
}

// Fire-and-forget entry point for the completion path (hand to waitUntil()).
// Never throws and never returns a value the caller could branch on: Slack
// delivery must never affect completion or the email path, so every failure
// is a loud log here and nowhere else.
export async function sendLeadNotificationToSlack(
  webhookUrl: string,
  fields: LeadNotificationFields
): Promise<void> {
  try {
    const message = buildLeadNotificationMessage(fields);
    if (!message) {
      console.log(
        `[slack] lead notification skipped for ${fields.responseUrl}: score ${fields.leadScore}/10 below Slack threshold`
      );
      return;
    }
    const result = await postSlackMessage(webhookUrl, message);
    if (result.ok) {
      console.log(`[slack] lead notification sent for ${fields.responseUrl}`);
    } else {
      console.error(`[slack] lead notification failed for ${fields.responseUrl}: ${result.error}`);
    }
  } catch (err) {
    console.error(`[slack] lead notification threw unexpectedly for ${fields.responseUrl}:`, err);
  }
}
