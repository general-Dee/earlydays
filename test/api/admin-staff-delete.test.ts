import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
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
  doc.mockImplementation(() => ({ get, delete: del }));
  file.mockImplementation(() => ({ delete: fileDelete }));
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/staff/s1", { method: "DELETE", headers });
}

function context(id = "s1") {
  return { params: { id } };
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
  delete process.env.ADMIN_EMAILS_STAFF;
});

describe("DELETE /api/admin/staff/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the Storage photo and the Firestore doc when a photo exists", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ photoStoragePath: "staff/s1/s1-1.jpg" }) });

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(file).toHaveBeenCalledWith("staff/s1/s1-1.jpg");
    expect(fileDelete).toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it("still deletes the Firestore doc when there's no photo", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({}) });

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(res.status).toBe(200);
    expect(file).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it("swallows Storage delete failures and still deletes the Firestore doc", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ photoStoragePath: "staff/s1/s1-1.jpg" }) });
    fileDelete.mockRejectedValue(new Error("storage down"));

    const { DELETE } = await import("@/app/api/admin/staff/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalled();
  });
});
