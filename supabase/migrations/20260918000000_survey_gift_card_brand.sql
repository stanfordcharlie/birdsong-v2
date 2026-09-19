-- Gift card brand: the label the study creator picks alongside the amount
-- (Amazon, Chipotle, ...), so respondent copy can say "$15 Chipotle gift
-- card" instead of the generic "gift card". Free text rather than an enum:
-- the wizard offers a fixed list plus "Other", and "Other" writes whatever
-- was typed. Nullable and never backfilled: a study with an amount and no
-- brand keeps rendering the generic phrase exactly as it does today.
--
-- Label only. Nothing here touches purchase, redemption or delivery, which
-- stay manual.

alter table public.surveys add column if not exists gift_card_brand text;
