import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const deleteFn = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

collection.mockImplementation(() => ({ doc }));
doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { delete: deleteFn }));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/inquiries/i1", {
    method: "DELETE",
    headers,
  });
}

function context(id = "i1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => (docCalls++ === 0 ? { get: () => Promise.resolve({ exists: false }) } : { delete: deleteFn }));
  deleteFn.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_INQUIRIES;
});

describe("DELETE /api/admin/inquiries/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    const { DELETE } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { DELETE } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer bad" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { DELETE } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("deletes the inquiry for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { DELETE } = await import("@/app/api/admin/inquiries/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context("i1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collection).toHaveBeenCalledWith("inquiries");
    expect(doc).toHaveBeenCalledWith("i1");
    expect(deleteFn).toHaveBeenCalled();
  });
});
