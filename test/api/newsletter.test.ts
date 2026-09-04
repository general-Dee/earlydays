import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const docSet = vi.fn();
const doc = vi.fn();
const collection = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "1.2.3.4",
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

doc.mockImplementation(() => ({ set: docSet }));
collection.mockImplementation(() => ({ doc }));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  doc.mockImplementation(() => ({ set: docSet }));
  collection.mockImplementation(() => ({ doc }));
  docSet.mockResolvedValue(undefined);
  checkRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/newsletter", () => {
  it("returns ok without writing when the honeypot is filled", async () => {
    const { POST } = await import("@/app/api/newsletter/route");
    const res = await POST(jsonRequest({ email: "bot@example.com", hp: "filled" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(docSet).not.toHaveBeenCalled();
  });

  it("rejects a missing email", async () => {
    const { POST } = await import("@/app/api/newsletter/route");
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect(docSet).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const { POST } = await import("@/app/api/newsletter/route");
    const res = await POST(jsonRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(docSet).not.toHaveBeenCalled();
  });

  it("saves the subscriber, lowercased, keyed by email", async () => {
    const { POST } = await import("@/app/api/newsletter/route");
    const res = await POST(jsonRequest({ email: "Aisha@Example.com", name: "Aisha" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(doc).toHaveBeenCalledWith("aisha@example.com");
    expect(docSet).toHaveBeenCalledWith(
      expect.objectContaining({ email: "aisha@example.com", name: "Aisha" }),
      { merge: true }
    );
  });

  it("returns 429 and skips the write when rate limited", async () => {
    checkRateLimit.mockResolvedValue(false);
    const { POST } = await import("@/app/api/newsletter/route");
    const res = await POST(jsonRequest({ email: "a@b.com" }));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json).toEqual({ error: "Too many requests. Please try again later." });
    expect(docSet).not.toHaveBeenCalled();
  });
});
