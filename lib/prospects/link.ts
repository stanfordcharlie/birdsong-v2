// The tokenized respondent URL, in one place.
//
// Three callers need the same string and must not disagree about it: the
// export route (which writes it into a CSV that goes to a sending tool), the
// admin roster (copy and open), and anything that later emails it. A link
// that differs between the file and the screen is the bug this prevents.
export function prospectLinkFor(origin: string, slug: string, token: string): string {
  return `${canonicalOrigin(origin)}/study/${slug}/${token}`;
}

// The bare apex 308s to www in production, so a link minted on the apex
// costs every recipient a redirect hop (and shows the hop to mail scanners
// that follow links). Whatever origin was configured or observed, the link
// goes out on the host that answers directly. Any other host (localhost, a
// preview URL) is left alone, minus a trailing slash.
const APEX_HOST = "usebirdsong.com";
const CANONICAL_HOST = "www.usebirdsong.com";

export function canonicalOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.hostname === APEX_HOST) url.hostname = CANONICAL_HOST;
    return url.origin;
  } catch {
    return trimmed;
  }
}

// Where the link should point when it is generated on the server.
//
// NEXT_PUBLIC_APP_URL wins when set, because that is the canonical public
// origin and is what a link in a cold email has to carry — a deployment
// reached over a preview URL must still mint production links. The request's
// own origin is the fallback for local development, where the variable is
// often unset.
export function resolveAppOrigin(request: Request): string {
  return canonicalOrigin(resolveAppOriginFromHost(new URL(request.url).host));
}

// Same rule for a server component, which has a Host header rather than a
// Request. Shared so the roster page and the export route cannot drift.
export function resolveAppOriginFromHost(host: string | null): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return canonicalOrigin(configured);
  if (!host) return "";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}
