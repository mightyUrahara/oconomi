// Simple in-memory sliding-window rate limiter.
// NOTE: in-memory means limits reset on server restart/redeploy and aren't
// shared across serverless instances. Fine for a single-user demo — swap
// for a Redis/Upstash-backed limiter before this handles real traffic.

type Options = { interval: number; uniqueTokenPerInterval: number };
type CheckResult = { isRateLimited: boolean; retryAfterSeconds: number };

export default function rateLimit({ interval }: Options) {
  const hits = new Map<string, number[]>();

  return {
    check(limit: number, token: string): CheckResult {
      const now = Date.now();
      const windowStart = now - interval;
      const timestamps = (hits.get(token) || []).filter((t) => t > windowStart);

      if (timestamps.length >= limit) {
        const oldest = timestamps[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + interval - now) / 1000));
        hits.set(token, timestamps);
        return { isRateLimited: true, retryAfterSeconds };
      }

      timestamps.push(now);
      hits.set(token, timestamps);
      return { isRateLimited: false, retryAfterSeconds: 0 };
    },
  };
}