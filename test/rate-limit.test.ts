import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientIp, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getClientIp", () => {
  it("reads the first entry of x-forwarded-for", () => {
    const req = new NextRequest("http://localhost/api/contact", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    const req = new NextRequest("http://localhost/api/contact");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows up to max requests within the window and rejects the next one", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(true);
    }
    expect(checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(false);
  });

  it("allows requests again after the window passes", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(true);
    }
    expect(checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(true);
  });

  it("tracks separate keys independently", () => {
    expect(checkRateLimit("a", { max: 1, windowMs: 1000 })).toBe(true);
    expect(checkRateLimit("a", { max: 1, windowMs: 1000 })).toBe(false);
    expect(checkRateLimit("b", { max: 1, windowMs: 1000 })).toBe(true);
  });
});
