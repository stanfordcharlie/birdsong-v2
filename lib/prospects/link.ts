// The tokenized respondent URL, in one place.
//
// Three callers need the same string and must not disagree about it: the
// export route (which writes it into a CSV that goes to a sending tool), the
// admin roster (copy and open), and anything that later emails it. A link
// that differs between the file and the screen is the bug this prevents.
export function prospectLinkFor(origin: string, slug: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/study/${slug}/${token}`;
}

// Where the link should point when it is generated on the server.
//
// NEXT_PUBLIC_APP_URL wins when set, because that is the canonical public
// origin and is what a link in a cold email has to carry — a deployment
// reached over a preview URL must still mint production links. The request's
// own origin is the fallback for local development, where the variable is
// often unset.
export function resolveAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}
