import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";

const collection = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

function buildQuery() {
  const query = { where: () => query, limit: () => query, get };
  return query;
}

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admissions/status", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const fakeApplication = {
  childName: "Femi Okafor",
  childDob: "2021-03-01",
  desiredStage: "CR",
  guardianName: "Aisha Okafor",
  email: "a@b.com",
  phone: null,
  notes: "",
  status: "reviewing",
  referenceCode: "A1B2C3D4",
  createdAt: 12345,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  collection.mockImplementation(() => buildQuery());
});

describe("POST /api/admissions/status", () => {
  it("requires a reference code", async () => {
    const { POST } = await import("@/app/api/admissions/status/route");
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it("404s when no application matches", async () => {
    get.mockResolvedValue({ empty: true, docs: [] });
    const { POST } = await import("@/app/api/admissions/status/route");
    const res = await POST(jsonRequest({ referenceCode: "ZZZZZZZZ" }));
    expect(res.status).toBe(404);
  });

  it("returns the status for a matching reference code", async () => {
    get.mockResolvedValue({ empty: false, docs: [{ data: () => fakeApplication }] });
    const { POST } = await import("@/app/api/admissions/status/route");
    const res = await POST(jsonRequest({ referenceCode: "a1b2c3d4" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      status: "reviewing",
      childName: "Femi Okafor",
      desiredStage: "CR",
      submittedAt: 12345,
    });
  });

  it("rate limits repeated requests from the same IP", async () => {
    get.mockResolvedValue({ empty: true, docs: [] });
    const { POST } = await import("@/app/api/admissions/status/route");
    const headers = { "x-forwarded-for": "1.2.3.4" };

    for (let i = 0; i < 10; i++) {
      const res = await POST(jsonRequest({ referenceCode: "A1B2C3D4" }, headers));
      expect(res.status).toBe(404);
    }

    const res = await POST(jsonRequest({ referenceCode: "A1B2C3D4" }, headers));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json).toEqual({ error: "Too many requests. Please try again later." });
  });
});
