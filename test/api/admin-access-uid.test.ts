import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const updateUser = vi.fn();
const revokeRefreshTokens = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const update = vi.fn();
const deleteDoc = vi.fn();

// Keyed by uid so the actor's own identity check (always falls back to the
// ADMIN_EMAILS env var, i.e. "doesn't exist") stays independent of the
// target admin doc's existence, which individual tests below control.
const targetDocState = new Map<string, { exists: boolean; data?: () => Record<string, unknown> }>();

function docGetFor(uid: string) {
  if (uid === "actor1") return Promise.resolve({ exists: false });
  return Promise.resolve(
    targetDocState.get(uid) ?? { exists: true, data: () => ({ isSuperAdmin: false, areas: [] }) }
  );
}

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser, updateUser, revokeRefreshTokens }),
  getAdminDb: () => ({ collection }),
}));

const logAdminAction = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAdminAction: (...args: unknown[]) => logAdminAction(...args),
}));

const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

function patchRequest(uid: string, headers: Record<string, string> = {}, body?: unknown) {
  return {
    req: new NextRequest(`http://localhost/api/admin/access/${uid}`, {
      method: "PATCH",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    context: { params: { uid } },
  };
}

function deleteRequest(uid: string, headers: Record<string, string> = {}) {
  return {
    req: new NextRequest(`http://localhost/api/admin/access/${uid}`, { method: "DELETE", headers }),
    context: { params: { uid } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  targetDocState.clear();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation((uid: string) => ({ get: () => docGetFor(uid), update, delete: deleteDoc }));
  process.env.ADMIN_EMAILS = "boss@earlydays.example";
  verifyIdToken.mockResolvedValue({ uid: "actor1", email: "boss@earlydays.example" });
  getUser.mockResolvedValue({ disabled: false });
  updateUser.mockResolvedValue(undefined);
  revokeRefreshTokens.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
  deleteDoc.mockResolvedValue(undefined);
  checkRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("PATCH /api/admin/access/[uid]", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", {}, { displayName: "New Name" });
    const res = await PATCH(req, context);
    expect(res.status).toBe(401);
  });

  it("429s and skips the update when rate limited", async () => {
    checkRateLimit.mockResolvedValue(false);
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", { authorization: "Bearer ok" }, { displayName: "New Name" });
    const res = await PATCH(req, context);
    expect(res.status).toBe(429);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s when the body has nothing to update", async () => {
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", { authorization: "Bearer ok" }, {});
    const res = await PATCH(req, context);
    expect(res.status).toBe(400);
  });

  it("400s when the actor tries to disable their own account", async () => {
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("actor1", { authorization: "Bearer ok" }, { disabled: true });
    const res = await PATCH(req, context);
    expect(res.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("404s when the target admin doc no longer exists", async () => {
    targetDocState.set("target1", { exists: false });
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", { authorization: "Bearer ok" }, { displayName: "New Name" });
    const res = await PATCH(req, context);
    expect(res.status).toBe(404);
  });

  it("400s on an invalid displayName", async () => {
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", { authorization: "Bearer ok" }, { displayName: "  " });
    const res = await PATCH(req, context);
    expect(res.status).toBe(400);
  });

  it("updates displayName/areas and logs admin.updated", async () => {
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest(
      "target1",
      { authorization: "Bearer ok" },
      { displayName: "New Name", areas: ["blog", "gallery"] }
    );
    const res = await PATCH(req, context);

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "New Name", areas: ["blog", "gallery"] })
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.updated", targetUid: "target1" })
    );
  });

  it("disables the account, revokes refresh tokens, and logs admin.disabled", async () => {
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", { authorization: "Bearer ok" }, { disabled: true });
    const res = await PATCH(req, context);

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("target1", { disabled: true });
    expect(revokeRefreshTokens).toHaveBeenCalledWith("target1");
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.disabled", targetUid: "target1" })
    );
  });

  it("enables the account without revoking refresh tokens and logs admin.enabled", async () => {
    const { PATCH } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = patchRequest("target1", { authorization: "Bearer ok" }, { disabled: false });
    const res = await PATCH(req, context);

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("target1", { disabled: false });
    expect(revokeRefreshTokens).not.toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.enabled", targetUid: "target1" })
    );
  });
});

describe("DELETE /api/admin/access/[uid]", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { DELETE } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = deleteRequest("target1");
    const res = await DELETE(req, context);
    expect(res.status).toBe(401);
  });

  it("429s and skips the delete when rate limited", async () => {
    checkRateLimit.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = deleteRequest("target1", { authorization: "Bearer ok" });
    const res = await DELETE(req, context);
    expect(res.status).toBe(429);
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("400s when the actor tries to remove their own account", async () => {
    const { DELETE } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = deleteRequest("actor1", { authorization: "Bearer ok" });
    const res = await DELETE(req, context);
    expect(res.status).toBe(400);
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("removes the target admin and logs admin.removed", async () => {
    const { DELETE } = await import("@/app/api/admin/access/[uid]/route");
    const { req, context } = deleteRequest("target1", { authorization: "Bearer ok" });
    const res = await DELETE(req, context);

    expect(res.status).toBe(200);
    expect(deleteDoc).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.removed", targetUid: "target1" })
    );
  });
});
