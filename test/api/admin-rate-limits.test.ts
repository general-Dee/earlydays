import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const docGet = vi.fn();
const orderBy = vi.fn();
const limit = vi.fn();
const listGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/rate-limits", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc, orderBy }));
  doc.mockImplementation(() => ({ get: docGet }));
  orderBy.mockImplementation(() => ({ limit }));
  limit.mockImplementation(() => ({ get: listGet }));
  docGet.mockResolvedValue({ exists: false });
  process.env.ADMIN_EMAILS = "boss@earlydays.example";
  verifyIdToken.mockResolvedValue({ uid: "actor1", email: "boss@earlydays.example" });
  getUser.mockResolvedValue({ disabled: false });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("GET /api/admin/rate-limits", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/rate-limits/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { GET } = await import("@/app/api/admin/rate-limits/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(listGet).not.toHaveBeenCalled();
  });

  it("returns rate-limit buckets ordered by most recent reset first", async () => {
    const buckets = [
      { id: "contact:1.2.3.4", count: 3, resetAt: 200 },
      { id: "admin-access-write:boss@earlydays.example", count: 1, resetAt: 100 },
    ];
    listGet.mockResolvedValue({
      docs: buckets.map((bucket) => ({ id: bucket.id, data: () => ({ count: bucket.count, resetAt: bucket.resetAt }) })),
    });

    const { GET } = await import("@/app/api/admin/rate-limits/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.buckets).toEqual(buckets.map(({ id, count, resetAt }) => ({ key: id, count, resetAt })));
    expect(collection).toHaveBeenCalledWith("rateLimits");
    expect(orderBy).toHaveBeenCalledWith("resetAt", "desc");
    expect(limit).toHaveBeenCalledWith(500);
  });
});
