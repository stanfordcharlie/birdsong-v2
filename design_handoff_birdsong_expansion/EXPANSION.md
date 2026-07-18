# Handoff: Birdsong Expansion Landing Page (secondary page)

This is the **second page of the marketing site you already built** from the earlier inbound handoff. The inbound landing page is already implemented in this codebase: reuse its existing design tokens, fonts, nav/footer components, demo window construction, keyframes, and demo phase state machine. This document only specifies what is DIFFERENT on the expansion page. The two pages must cross-link.

One update to apply to the EXISTING inbound page too: demo phase durations on both pages are now `[2600, 3200, 2000, 4800, 2600, 3000, 2600, 2200, 5200, 1400]` ms, and the how-it-works cycling chips run on a 9s cycle (delays 0/1.5s/3s). If the deployed inbound page still uses the older, faster timings, update it to match.

## What this page is
A landing page for Birdsong's **upsell / expansion motion**: the same AI-moderated research conversations, aimed at a company's own existing customers instead of cold prospects. Buyer persona: Customer Success leaders and Account Managers / expansion reps (not demand gen).

Routes: suggest `/` for the inbound page, `/expansion` (or `/customer-success`) for this one.

## Positioning constraints (copy must not drift)
- Extends real conversation to the long tail of accounts that only get "tech touch" today. It does NOT replace a CSM's QBR or relationship ("QBRs and check-ins stay exactly as they are").
- NOT a health-score / usage-analytics tool (Gainsight et al.) and NOT another NPS/CSAT survey. The differentiator: asked, not inferred.
- Outreach reads as occasional and meaningful ("once a year", "Paced for people"), never continuous.
- The research feels independent, so CSMs never have to probe for upsell themselves (trust preserved).
- No em dashes. No purple. Same paper/ink/pine-green palette.

## Differences vs the inbound page

### Nav
Same structure, plus a cross-link "For Inbound leads" (user-edited label — keep exactly) pointing to the inbound page, before "How it works" / "Features". The inbound page currently has no reciprocal link; add one ("For customer success") if navigation symmetry is desired.

### Hero
- Green caps eyebrow above H1: "BIRDSONG FOR CUSTOMER SUCCESS"
- H1: "Hear the customers you never get to."
- Subhead: "Past your top accounts, most of your base never gets a real conversation. Birdsong invites them into one, and hands your team the expansion opportunities it surfaces, with the whole story already there."
- Same CTA pair ("Get started" / "See how it works").

### Self-playing demo (same 10-phase machine, same timings as README)
Phase durations (ms, current slowed pacing, shared by BOTH pages): `[2600, 3200, 2000, 4800, 2600, 3000, 2600, 2200, 5200, 1400]`.

Content swaps:
- Session header: "Industry conversation" / "Operations tooling in practice · 15 min · once a year · paid session"; status chip "Invited" → "Question 3 of 7" → "Complete"
- Joining line: "Priya accepted the invite · joining the session…"
- AI question: "How has the way your team uses its ops tooling changed over the past year?"
- Answer: "Honestly, we've doubled the team on it, and two other departments keep asking for seats. We've been working around the limits of our plan for months."
- Done note: "Conversation complete · 14 min"
- Team view label: "DELIVERED TO YOUR CS TEAM"
- Lead row: avatar "PN", "Priya Nair", "Ops Lead · Fernwood Labs · customer for 2 years"; meta line "Conversation complete · 7 questions · 14 min"
- Badge: "Scoring" (default) → "Expansion ready" (success)
- Extracted chip: "Expansion signal: two more departments asking for seats"
- Score bar labeled "Expansion score", 12% → 88%, label "88, strong"
- CTA button: "Route to account owner" → success row "✓ Routed to Dana (CSM, Fernwood) with the full conversation" (no demo booking on this page — expansion ownership varies, so it routes to whoever owns the account)

### How it works (same 3-column band)
- H2: "A real conversation for every account, not just the top fifteen."
- **Invite**: "Your long tail gets usage dashboards, not conversations. Birdsong invites those customers into one: occasional, paid, and worth their time." (ripple animation)
- **Converse**: "The research stands apart from the relationship, so nobody has to probe. Growth, friction, and appetite surface in the customer's own words." Cycling chips (9s cycle, delays 0/1.5s/3s): "Growth: team doubled this year", "Appetite: two departments want in", "Friction: working around plan limits"
- **Deliver**: "The opportunity lands with whoever owns the account, scored and sourced, with the conversation attached. QBRs and check-ins stay exactly as they are." Floating mini card: "Fernwood Labs" / "Expansion ready · routed to Dana" + green "88 fit" pill

### Features (same 2×2 hairline grid)
- H2: "Asked, not inferred."
1. **Beyond the health score** — "Usage data guesses. A conversation hears the two departments asking for seats."
2. **Trust, kept intact** — "Your CSMs never have to pitch mid-relationship. The research stands apart, so the relationship stays warm."
3. **The whole base, heard** — "Real conversations for the hundreds of accounts tech touch never reaches, not just the ones with a CSM."
4. **Paced for people** — "Occasional and meaningful by design. One good conversation a year beats a survey every quarter."

### Footer CTA
- H2: "Hear your whole base."
- Sub: "Runs alongside your NPS tool. Your first expansion signals within the month."
- Bottom row includes the "Inbound leads" cross-link.

## Files
- `BirdSong Expansion.dc.html` — this page's design reference (HTML prototype, not production code)
- The shared system spec and inbound page live in the codebase already (from the earlier `design_handoff_birdsong_landing` package)
