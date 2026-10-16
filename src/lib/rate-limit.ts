/**
 * Fixed-window, in-memory rate limiter. Fine for a single-process internal tool; behind several
 * instances it would need a shared store (Redis etc.).
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const windows = new Map<string, { start: number; count: number }>();

  return function check(key: string) {
    const t = now();
    // Drop expired windows so the map can't grow without bound.
    if (windows.size > 1000) for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);

    const w = windows.get(key);
    if (!w || t - w.start >= windowMs) {
      windows.set(key, { start: t, count: 1 });
      return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
    }
    if (w.count >= limit) return { ok: false, remaining: 0, retryAfterSec: Math.ceil((w.start + windowMs - t) / 1000) };
    w.count++;
    return { ok: true, remaining: limit - w.count, retryAfterSec: 0 };
  };
}

/**
 * Rate-limit bucket for a request. Forwarding headers are client-controlled unless a reverse proxy
 * overwrites them, so they're ignored by default: every request shares one global bucket, and
 * rotating a fake x-forwarded-for can't buy more requests. Set TRUST_PROXY=true only behind a proxy
 * that sets the header.
 */
export function clientKey(req: Request, trustProxy = process.env.TRUST_PROXY === "true") {
  if (!trustProxy) return "global";
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
