// Shared between the respondent intro form (client, for the inline
// submit-time check) and /api/interview/start (server, source of truth) so
// the two can never drift — the client check is UX only, the server one is
// what actually gates the row getting created.

// ~20 common free/personal providers. A respondent on one of these is
// blocked from starting the interview: we need a work domain to derive a
// company name and to make the gift-card send read as a business handoff.
export const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
  "fastmail.com",
] as const;

const FREE_EMAIL_DOMAIN_SET = new Set<string>(FREE_EMAIL_DOMAINS);

export function extractEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

export function isFreeEmailDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAIN_SET.has(domain.toLowerCase());
}

// Second-level ccTLDs (co.uk, com.au, ...) where the real company label is
// the label *before* both of these parts, not just the last one — without
// this a domain like "acme-corp.co.uk" would derive "Co" instead of "Acme
// Corp". Not exhaustive, just the common ones.
const SECOND_LEVEL_TLDS = new Set([
  "co.uk",
  "co.jp",
  "co.nz",
  "co.za",
  "co.in",
  "co.kr",
  "com.au",
  "com.br",
  "com.mx",
  "com.sg",
]);

// Strips the TLD (including two-part ccTLDs) and any subdomain, then
// title-cases what's left on word boundaries: "sales.acme-corp.co.uk" ->
// "Acme Corp". Good enough for a display label, not a legal-entity lookup.
export function deriveCompanyNameFromDomain(domain: string): string {
  const labels = domain.toLowerCase().split(".").filter(Boolean);
  const lastTwo = labels.slice(-2).join(".");
  const withoutTld = SECOND_LEVEL_TLDS.has(lastTwo) ? labels.slice(0, -2) : labels.slice(0, -1);
  const core = withoutTld.length > 0 ? withoutTld[withoutTld.length - 1] : labels[0];

  return core
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
