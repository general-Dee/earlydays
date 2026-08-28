import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const store = new Map<string, { count: number; resetAt: number }>();

const get = vi.fn(async (ref: { id: string }) => {
  const data = store.get(ref.id);
  return { exists: !!data, data: () => data };
});
const set = vi.fn((ref: { id: string }, value: { count: number; resetAt: number }) => {
  store.set(ref.id, value);
});
const update = vi.fn((ref: { id: string }, patch: Partial<{ count: number; resetAt: number }>) => {
  const current = store.get(ref.id);
  if (current) store.set(ref.id, { ...current, ...patch });
});
const runTransaction = vi.fn(async (fn: (tx: { get: typeof get; set: typeof set; update: typeof update }) => unknown) =>
  fn({ get, set, update })
);
const doc = vi.fn((id: string) => ({ id }));
const collection = vi.fn(() => ({ doc }));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection, runTransaction }),
}));

beforeEach(() => {
  store.clear();
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
  it("allows up to max requests within the window and rejects the next one", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(true);
    }
    expect(await checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(false);
  });

  it("allows requests again after the window passes", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(true);
    }
    expect(await checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(await checkRateLimit("key", { max: 3, windowMs: 1000 })).toBe(true);
  });

  it("tracks separate keys independently", async () => {
    expect(await checkRateLimit("a", { max: 1, windowMs: 1000 })).toBe(true);
    expect(await checkRateLimit("a", { max: 1, windowMs: 1000 })).toBe(false);
    expect(await checkRateLimit("b", { max: 1, windowMs: 1000 })).toBe(true);
  });
});
