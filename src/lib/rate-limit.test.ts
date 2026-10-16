import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` requests per window, then blocks with a retry hint, then resets", () => {
    let t = 0;
    const check = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
    expect([check("a"), check("a"), check("a")].map((r) => r.ok)).toEqual([true, true, true]);
    const blocked = check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);

    t = 45_000;
    expect(check("a").retryAfterSec).toBe(15);
    t = 60_000;
    expect(check("a")).toMatchObject({ ok: true, remaining: 2 });
  });

  it("keeps separate buckets per key", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(check("a").ok).toBe(true);
    expect(check("a").ok).toBe(false);
    expect(check("b").ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first forwarded address, then x-real-ip, then a shared local bucket", () => {
    const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
    expect(clientKey(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientKey(req({}))).toBe("local");
  });
});
