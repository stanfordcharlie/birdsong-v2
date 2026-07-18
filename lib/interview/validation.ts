// Server-side caps for the public, unauthenticated interview endpoints.
// These are abuse/cost guards (unbounded input inflates Anthropic token
// spend and can bloat the stored transcript), not respondent-facing UX
// validation — the composer itself doesn't restrict length.
export const MESSAGE_MAX_LENGTH = 2000;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const CUSTOM_FIELD_MAX_LENGTH = 500;

// Deliberately simple: catches obviously malformed input (missing "@", no
// domain) without trying to fully validate per RFC 5322 — an actual
// deliverability check would need to send mail, not match a regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function truncate(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

// Trims and caps every string value in a respondent's custom field
// submission; non-string values pass through untouched since custom fields
// are free-form Json and callers are expected to have already validated
// their own types elsewhere.
export function sanitizeCustomFieldValues(
  values: Record<string, unknown> | undefined
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    sanitized[key] = typeof value === "string" ? truncate(value.trim(), CUSTOM_FIELD_MAX_LENGTH) : value;
  }
  return sanitized;
}
