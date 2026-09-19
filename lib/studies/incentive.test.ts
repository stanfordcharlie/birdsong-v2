import { describe, expect, it } from "vitest";
import { GIFT_CARD_BRANDS, giftCardPhrase, normalizeGiftCardBrand } from "./incentive";

describe("giftCardPhrase", () => {
  it("names the brand when one is set", () => {
    expect(giftCardPhrase(15, "Chipotle")).toBe("$15 Chipotle gift card");
  });

  it("is the generic phrase when the brand is null, unchanged from before brands existed", () => {
    expect(giftCardPhrase(15, null)).toBe("$15 gift card");
    expect(giftCardPhrase(15, undefined)).toBe("$15 gift card");
  });

  it("drops the amount when there is none", () => {
    expect(giftCardPhrase(null, "Amazon")).toBe("Amazon gift card");
    expect(giftCardPhrase(null, null)).toBe("gift card");
  });
});

describe("normalizeGiftCardBrand", () => {
  it("trims, caps at 40 characters, and nulls the empty string", () => {
    expect(normalizeGiftCardBrand("  Chipotle ")).toBe("Chipotle");
    expect(normalizeGiftCardBrand("")).toBeNull();
    expect(normalizeGiftCardBrand("   ")).toBeNull();
    expect(normalizeGiftCardBrand("a".repeat(60))).toHaveLength(40);
  });
});

describe("GIFT_CARD_BRANDS", () => {
  it("offers no cash-equivalent transfer option", () => {
    const lower = GIFT_CARD_BRANDS.map((b) => b.toLowerCase());
    for (const banned of ["venmo", "paypal", "cash app"]) {
      expect(lower.some((b) => b.includes(banned))).toBe(false);
    }
  });
});
