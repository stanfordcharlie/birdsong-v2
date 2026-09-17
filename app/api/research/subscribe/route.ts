import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, isRateLimited } from "@/lib/interview/rate-limit";

/**
 * POST /api/research/subscribe
 *
 * Public and unauthenticated by design: it is a research mailing list on a
 * public page. research_subscribers has RLS on with no policies, so the anon
 * key cannot touch it at all and this route writes with the service role.
 * That also means the address list is not readable from the browser even by
 * someone holding the anon key.
 */

// Its own limiter rather than borrowing an interview one, so a flood here
// cannot consume an interview's budget. 5 per hour per IP is far above any
// real use of a single form and well below what makes list-stuffing worth
// the effort.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const subscribeRateLimiter =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "ratelimit:research-subscribe",
      })
    : null;

// Deliberately loose: the point is to reject obvious junk before it reaches
// the database, not to adjudicate RFC 5322. Real deliverability is settled
// by the first send, not by a regex.
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

export async function POST(request: Request) {
  if (await isRateLimited(subscribeRateLimiter, getClientIp(request))) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: { email?: unknown; sourceSlug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // The slug is attribution only, so it is length-capped and otherwise
  // stored as sent; it is never used to build a query or a path.
  const rawSlug = typeof body.sourceSlug === "string" ? body.sourceSlug.trim() : "";
  const sourceSlug = rawSlug.length > 0 && rawSlug.length <= 200 ? rawSlug : null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("research_subscribers")
    .insert({ email, source_report_slug: sourceSlug });

  if (error) {
    // 23505 is the unique index on lower(email). Already subscribed is a
    // success from the reader's point of view, and answering differently
    // would turn this endpoint into a way to test whether an address is on
    // the list.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    console.error("[research/subscribe] insert failed:", error.message);
    return NextResponse.json({ error: "Could not save that. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
