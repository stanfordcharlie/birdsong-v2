/**
 * The canonical origin for the public library.
 *
 * Canonical URLs, JSON-LD @id values and the sitemap all have to agree on
 * one origin, and they are baked into static HTML at build time. Preferring
 * the explicit NEXT_PUBLIC_APP_URL over Vercel's per-deployment
 * VERCEL_URL matters: VERCEL_URL is the unique deployment hostname
 * (birdsong-v2-<hash>.vercel.app), so canonicalising to it would point every
 * indexed page at a URL that changes on the next deploy.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "https://usebirdsong.com";
}
