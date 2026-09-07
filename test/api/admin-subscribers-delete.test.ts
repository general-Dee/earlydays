import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const del = vi.fn();
const auditSet = vi.fn();
let docCalls = 0;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser }),
  getAdminDb: () => ({ collection }),
}));

// Call order per request: (1) resolveAdminIdentity's `adminUsers/{uid}` lookup
// — resolved to "no doc" so the ADMIN_EMAILS* env fallback applies; (2) the
// subscriber doc's own `.delete()`; (3) logAdminAction's `auditLog` doc write.
function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => {
    const call = docCalls++;
    if (call === 0) return { get: () => Promise.resolve({ exists: false }) };
    if (call === 1) return { delete: del };
    return { id: "a1", set: auditSet };
  });
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/subscribers/parent%40example.com", {
    method: "DELETE",
    headers,
  });
}

function context(id = "parent%40example.com") {
  return { params: { id } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "staff@earlydays.example";
  verifyIdToken.mockResolvedValue({ email: "staff@earlydays.example" });
  del.mockResolvedValue(undefined);
  auditSet.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS_SUBSCRIBERS;
});

describe("DELETE /api/admin/subscribers/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { DELETE } = await import("@/app/api/admin/subscribers/[id]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { DELETE } = await import("@/app/api/admin/subscribers/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the Firestore doc, decoding the URI-encoded email id", async () => {
    const { DELETE } = await import("@/app/api/admin/subscribers/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collection).toHaveBeenCalledWith("subscribers");
    expect(doc).toHaveBeenCalledWith("parent@example.com");
    expect(del).toHaveBeenCalled();
  });

  it("logs the deletion to the audit trail with the decoded email", async () => {
    const { DELETE } = await import("@/app/api/admin/subscribers/[id]/route");
    await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(collection).toHaveBeenCalledWith("auditLog");
    expect(auditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subscriber.deleted",
        actorEmail: "staff@earlydays.example",
        targetEmail: "parent@example.com",
      })
    );
  });
});
