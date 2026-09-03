import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/me", { headers });
}

function mockNoAdminDoc() {
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get }));
  get.mockResolvedValue({ exists: false });
}

function mockAdminDoc(data: Record<string, unknown>) {
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get }));
  get.mockResolvedValue({ exists: true, data: () => data });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNoAdminDoc();
  getUser.mockResolvedValue({ disabled: false });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("GET /api/admin/me", () => {
  it("401s when the Authorization header is missing", async () => {
    const { GET } = await import("@/app/api/admin/me/route");
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("403s when the caller has no adminUsers doc and matches no env allowlist", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1", email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/me/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
  });

  it("returns isSuperAdmin and areas for an env-fallback global admin", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ uid: "u1", email: "staff@earlydays.example" });
    const { GET } = await import("@/app/api/admin/me/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ isSuperAdmin: true, areas: [] });
  });

  it("returns isSuperAdmin and areas for a Firestore-backed area-scoped admin", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    mockAdminDoc({ isSuperAdmin: false, areas: ["blog", "gallery"] });
    const { GET } = await import("@/app/api/admin/me/route");
    const res = await GET(request({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ isSuperAdmin: false, areas: ["blog", "gallery"] });
  });
});
