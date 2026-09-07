import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const deleteFn = vi.fn();
const auditSet = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

// Call order per request: (1) resolveAdminIdentity's `adminUsers/{uid}` lookup
// — "no doc" so the ADMIN_EMAILS* env fallback applies; (2) the announcement
// doc itself, read (for the audit entry's title) then deleted; (3)
// logAdminAction's `auditLog` doc write.
function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => {
    const call = docCalls++;
    if (call === 0) return { get: () => Promise.resolve({ exists: false }) };
    if (call === 1) {
      return {
        get: () => Promise.resolve({ exists: true, data: () => ({ title: "Sports Day" }) }),
        delete: deleteFn,
      };
    }
    return { id: "log1", set: auditSet };
  });
}

resetChain();

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/announcements/a1", {
    method: "DELETE",
    headers,
  });
}

function context(id = "a1") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  deleteFn.mockResolvedValue(undefined);
  auditSet.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_ANNOUNCEMENTS;
});

describe("DELETE /api/admin/announcements/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    const { DELETE } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { DELETE } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer bad" }), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { DELETE } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("deletes the announcement for an allow-listed admin email", async () => {
    process.env.ADMIN_EMAILS = "Staff@Earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { DELETE } = await import("@/app/api/admin/announcements/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context("a1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collection).toHaveBeenCalledWith("announcements");
    expect(doc).toHaveBeenCalledWith("a1");
    expect(deleteFn).toHaveBeenCalled();
  });

  it("logs the deletion to the audit trail with the announcement's title", async () => {
    process.env.ADMIN_EMAILS = "staff@earlydays.example";
    verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
    const { DELETE } = await import("@/app/api/admin/announcements/[id]/route");
    await DELETE(request({ authorization: "Bearer ok" }), context("a1"));

    expect(collection).toHaveBeenCalledWith("auditLog");
    expect(auditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "announcement.deleted",
        actorEmail: "staff@earlydays.example",
        detail: "Sports Day",
      })
    );
  });
});
