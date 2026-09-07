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
  return new NextRequest("http://localhost/api/admin/audit", { headers });
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

describe("GET /api/admin/audit", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/audit/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { GET } = await import("@/app/api/admin/audit/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(listGet).not.toHaveBeenCalled();
  });

  it("returns audit log entries ordered by most recent first", async () => {
    const entries = [
      { id: "log2", action: "admin.disabled", actorEmail: "boss@earlydays.example", targetUid: "u2", createdAt: 200 },
      {
        id: "log1",
        action: "admin.created",
        actorEmail: "boss@earlydays.example",
        targetUid: "u2",
        targetEmail: "musa@earlydays.example",
        detail: "blog",
        createdAt: 100,
      },
    ];
    listGet.mockResolvedValue({ docs: entries.map((entry) => ({ data: () => entry })) });

    const { GET } = await import("@/app/api/admin/audit/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.entries).toEqual(entries);
    expect(collection).toHaveBeenCalledWith("auditLog");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(limit).toHaveBeenCalledWith(500);
  });
});
