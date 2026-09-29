import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// The limiter for the study brief conversation, on the same Upstash project
// and the same terms as the interview limiters in lib/interview/rate-limit.ts:
// without both env vars it is null, and isRateLimited there reads null as
// "not limited", so local development needs no setup.
//
// The route is signed-in only, so the key is the user rather than the IP.
// 20 turns a minute is several times what a person typing can send, and one
// model call per turn is what it protects.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const converseRateLimiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        prefix: "ratelimit:study-brief-converse",
      })
    : null;
