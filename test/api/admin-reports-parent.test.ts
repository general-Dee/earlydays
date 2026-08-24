import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const reportsCollection = vi.fn();
const orderBy = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ collection: reportsCollection }));
  reportsCollection.mockImplementation(() => ({ orderBy }));
  orderBy.mockImplementation(() => ({ get }));
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/reports/u1", { headers });
}

function context(parentUid = "u1") {
  return { params: { parentUid } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_REPORTS;
});

describe("GET /api/admin/reports/[parentUid]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/reports/[parentUid]/route");
    const res = await GET(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { GET } = await import("@/app/api/admin/reports/[parentUid]/route");
    const res = await GET(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns reports for the given parent, newest first", async () => {
    get.mockResolvedValue({
      docs: [
        { data: () => ({ id: "r2", childId: "c1", childName: "Zainab", term: "Term 3", fileName: "b.pdf", storagePath: "reports/u1/r2.pdf", uploadedBy: "staff@earlydays.example", createdAt: 2 }) },
        { data: () => ({ id: "r1", childId: "c1", childName: "Zainab", term: "Term 2", fileName: "a.pdf", storagePath: "reports/u1/r1.pdf", uploadedBy: "staff@earlydays.example", createdAt: 1 }) },
      ],
    });

    const { GET } = await import("@/app/api/admin/reports/[parentUid]/route");
    const res = await GET(request({ authorization: "Bearer ok" }), context("u1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reports).toHaveLength(2);
    expect(json.reports[0]).toMatchObject({ id: "r2" });
    expect(collection).toHaveBeenCalledWith("parents");
    expect(doc).toHaveBeenCalledWith("u1");
    expect(reportsCollection).toHaveBeenCalledWith("reports");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });
});
