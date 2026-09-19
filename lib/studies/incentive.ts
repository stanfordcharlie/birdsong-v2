// The respondent-facing wording for a study's incentive, in one place.
//
// The study creator picks an amount and, optionally, a brand. Every place
// a respondent reads about the incentive (the welcome sticker, the intake
// form, the completion screen, the wizard preview of those screens) builds
// its phrase here, so "$15 Chipotle gift card" and "$15 gift card" can never
// drift apart between screens. The brand is a label only: nothing about
// purchase, redemption or delivery reads it.

/** The fixed list the wizard offers, in display order. "Other" is free text. */
export const GIFT_CARD_BRANDS = [
  "Amazon",
  "Chipotle",
  "Starbucks",
  "DoorDash",
  "Target",
  "Visa prepaid",
] as const;

export const GIFT_CARD_BRAND_MAX_LENGTH = 40;

/** Trimmed and capped. Empty becomes null, which renders the generic phrase. */
export function normalizeGiftCardBrand(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim().slice(0, GIFT_CARD_BRAND_MAX_LENGTH).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * "$15 Chipotle gift card" when a brand is set, "$15 gift card" when not,
 * which is exactly what every study rendered before brands existed. With no
 * amount the phrase is the bare noun ("Chipotle gift card" / "gift card"),
 * for copy that mentions the incentive without stating a figure.
 */
export function giftCardPhrase(amount: number | null | undefined, brand: string | null | undefined): string {
  const noun = brand ? `${brand} gift card` : "gift card";
  return amount != null ? `$${amount} ${noun}` : noun;
}
