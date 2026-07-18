import { randomBytes, timingSafeEqual } from "crypto";

// Bound to a responses row at start and required on every continue call, so
// a guessable/enumerable response_id UUID alone is never sufficient to post
// messages into someone else's interview.
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

// Plain === leaks timing information proportional to how many leading
// characters match. response_id (and therefore which stored token an
// attacker would be guessing against) isn't itself secret, so the
// comparison has to be constant-time.
export function tokensMatch(provided: string, stored: string): boolean {
  const providedBuf = Buffer.from(provided);
  const storedBuf = Buffer.from(stored);
  if (providedBuf.length !== storedBuf.length) {
    // Still run a same-length comparison so a length mismatch doesn't
    // return in observably less time than a same-length near-match.
    timingSafeEqual(storedBuf, storedBuf);
    return false;
  }
  return timingSafeEqual(providedBuf, storedBuf);
}
