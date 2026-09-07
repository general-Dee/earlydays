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
// — "no doc" so the ADMIN_EMAILS* env fallback applies; (2) the FAQ doc
// itself, read (for the audit entry's question) then deleted; (3)
// logAdminAction's `auditLog` doc write.
function resetChain() {
  collection.mockImplementation(() => ({ doc }));
  docCalls = 0;
  doc.mockImplementation(() => {
    const call = docCalls++;
    if (call === 0) return { get: () => Promise.resolve({ exists: false }) };
    if (call === 1) {
      return {
        get: () => Promise.resolve({ exists: true, data: () => ({ question: "What ages do you take?" }) }),
        delete: del,
      };
    }
    return { id: "log1", set: auditSet };
  });
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/faqs/f1", { method: "DELETE", headers });
}

function context(id = "f1") {
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
  delete process.env.ADMIN_EMAILS_FAQS;
});

describe("DELETE /api/admin/faqs/[id]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { DELETE } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s when the token's email isn't in ADMIN_EMAILS", async () => {
    verifyIdToken.mockResolvedValue({ email: "parent@example.com" });
    const { DELETE } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the Firestore doc for an allow-listed admin email", async () => {
    const { DELETE } = await import("@/app/api/admin/faqs/[id]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collection).toHaveBeenCalledWith("faqs");
    expect(doc).toHaveBeenCalledWith("f1");
    expect(del).toHaveBeenCalled();
  });

  it("logs the deletion to the audit trail with the FAQ's question", async () => {
    const { DELETE } = await import("@/app/api/admin/faqs/[id]/route");
    await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(collection).toHaveBeenCalledWith("auditLog");
    expect(auditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "faq.deleted",
        actorEmail: "staff@earlydays.example",
        detail: "What ages do you take?",
      })
    );
  });
});
