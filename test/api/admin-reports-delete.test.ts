import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const reportsCollection = vi.fn();
const reportDoc = vi.fn();
const get = vi.fn();
const del = vi.fn();
const file = vi.fn();
const fileDelete = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
  getAdminBucket: () => ({ file }),
}));

function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ collection: reportsCollection }));
  reportsCollection.mockImplementation(() => ({ doc: reportDoc }));
  reportDoc.mockImplementation(() => ({ get, delete: del }));
  file.mockImplementation(() => ({ delete: fileDelete }));
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/reports/u1/r1", { method: "DELETE", headers });
}

function context(parentUid = "u1", reportId = "r1") {
  return { params: { parentUid, reportId } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  del.mockResolvedValue(undefined);
  fileDelete.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_REPORTS;
});

describe("DELETE /api/admin/reports/[parentUid]/[reportId]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { DELETE } = await import("@/app/api/admin/reports/[parentUid]/[reportId]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { DELETE } = await import("@/app/api/admin/reports/[parentUid]/[reportId]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the Storage file and the Firestore doc when the report exists", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ storagePath: "reports/u1/r1.pdf" }) });

    const { DELETE } = await import("@/app/api/admin/reports/[parentUid]/[reportId]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(file).toHaveBeenCalledWith("reports/u1/r1.pdf");
    expect(fileDelete).toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it("still deletes the Firestore doc when the report doc doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });

    const { DELETE } = await import("@/app/api/admin/reports/[parentUid]/[reportId]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(res.status).toBe(200);
    expect(file).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it("swallows Storage delete failures and still deletes the Firestore doc", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ storagePath: "reports/u1/r1.pdf" }) });
    fileDelete.mockRejectedValue(new Error("storage down"));

    const { DELETE } = await import("@/app/api/admin/reports/[parentUid]/[reportId]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalled();
  });
});
