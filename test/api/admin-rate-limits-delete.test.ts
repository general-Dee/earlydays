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

const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

// Call order per request: (1) resolveAdminIdentity's `adminUsers/{uid}`
// lookup — resolved to "no doc" so the ADMIN_EMAILS env fallback applies as
// superadmin; (2) the bucket doc's own `.delete()`; (3) logAdminAction's
// `auditLog` doc write.
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
  return new NextRequest("http://localhost/api/admin/rate-limits/contact%3A1.2.3.4", {
    method: "DELETE",
    headers,
  });
}

function context(key = "contact%3A1.2.3.4") {
  return { params: { key } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ disabled: false });
  resetChain();
  process.env.ADMIN_EMAILS = "boss@earlydays.example";
  verifyIdToken.mockResolvedValue({ uid: "actor1", email: "boss@earlydays.example" });
  checkRateLimit.mockResolvedValue(true);
  del.mockResolvedValue(undefined);
  auditSet.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("DELETE /api/admin/rate-limits/[key]", () => {
  it("rejects requests without an Authorization header", async () => {
    verifyIdToken.mockReset();
    const { DELETE } = await import("@/app/api/admin/rate-limits/[key]/route");
    const res = await DELETE(request(), context());
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    doc.mockImplementationOnce(() => ({
      get: () => Promise.resolve({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) }),
    }));

    const { DELETE } = await import("@/app/api/admin/rate-limits/[key]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("429s and skips the delete when rate limited", async () => {
    checkRateLimit.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/rate-limits/[key]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    expect(res.status).toBe(429);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the bucket, decoding the URI-encoded key", async () => {
    const { DELETE } = await import("@/app/api/admin/rate-limits/[key]/route");
    const res = await DELETE(request({ authorization: "Bearer ok" }), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(collection).toHaveBeenCalledWith("rateLimits");
    expect(doc).toHaveBeenCalledWith("contact:1.2.3.4");
    expect(del).toHaveBeenCalled();
  });

  it("logs the deletion to the audit trail with the decoded key", async () => {
    const { DELETE } = await import("@/app/api/admin/rate-limits/[key]/route");
    await DELETE(request({ authorization: "Bearer ok" }), context());

    expect(collection).toHaveBeenCalledWith("auditLog");
    expect(auditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "rate_limit_bucket.deleted",
        actorEmail: "boss@earlydays.example",
        detail: "contact:1.2.3.4",
      })
    );
  });
});
