import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// /api/interview/start and /api/interview/continue are public and
// unauthenticated by design (respondents aren't logged in), so this is the
// only thing standing between them and unlimited Anthropic spend. Local dev
// usually has no Upstash project configured — rather than crash, rate
// limiting is skipped with a one-time warning so `npm run dev` keeps working
// with zero new setup. Set both env vars in Vercel to turn it on.
let warnedMissingConfig = false;

function buildRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warnedMissingConfig) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled. " +
          "Expected in local dev; set both in Vercel for production."
      );
      warnedMissingConfig = true;
    }
    return null;
  }
  return new Redis({ url, token });
}

const redis = buildRedisClient();

// 5 interview starts per 10 minutes per IP.
export const startRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "ratelimit:interview-start",
    })
  : null;

// 15 messages per minute — checked both per-IP and per-response_id so
// neither a single IP hammering many sessions nor many IPs hammering one
// session gets through. No human typist gets within range of this.
export const continueIpRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "1 m"),
      prefix: "ratelimit:interview-continue-ip",
    })
  : null;

export const continueResponseRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "1 m"),
      prefix: "ratelimit:interview-continue-response",
    })
  : null;

export async function isRateLimited(limiter: Ratelimit | null, key: string): Promise<boolean> {
  if (!limiter) return false;
  const { success } = await limiter.limit(key);
  return !success;
}

// Vercel's edge network sets x-forwarded-for; the first entry is the
// original client (subsequent entries are intermediate proxies).
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || "unknown";
}
