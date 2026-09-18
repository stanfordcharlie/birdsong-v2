import { customAlphabet } from "nanoid";

// The token in /study/[slug]/[token]. It is the whole credential for a
// prospect link: holding it is what proves the recipient is the person we
// emailed, so it is generated from nanoid's crypto RNG rather than anything
// derived from the prospect's own details.
//
// 12 characters of this 64-symbol alphabet is ~72 bits. The links go out in
// cold email, where length is visible and retyped by hand often enough to
// matter, and the lookup is additionally scoped to the survey slug — so this
// is sized to be unguessable at email-list scale, not to resist an offline
// attack on a hash.
const TOKEN_LENGTH = 12;

// URL-safe: nanoid's default alphabet minus nothing, which is already
// [A-Za-z0-9_-] and needs no encoding in a path segment. Spelled out here so
// a future nanoid default change cannot silently alter live token shapes.
const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

const nanoid = customAlphabet(TOKEN_ALPHABET, TOKEN_LENGTH);

export function generateProspectToken(): string {
  return nanoid();
}

// Cheap shape check before the database round trip. A path segment that
// cannot be a token (a stray path, an index file a crawler guessed at) is
// rejected here rather than becoming a query; anything that passes is still
// only a candidate until the lookup confirms it.
const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TOKEN_LENGTH}}$`);

export function looksLikeProspectToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}
