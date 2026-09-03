import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const getUser = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
const generatePasswordResetLink = vi.fn();
const getUsers = vi.fn();
const collection = vi.fn();
const doc = vi.fn();
const docGet = vi.fn();
const set = vi.fn();
const orderBy = vi.fn();
const listGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken, getUser, createUser, deleteUser, generatePasswordResetLink, getUsers }),
  getAdminDb: () => ({ collection }),
}));

const sendAdminInviteEmail = vi.fn();
vi.mock("@/lib/email/notify", () => ({
  sendAdminInviteEmail: (...args: unknown[]) => sendAdminInviteEmail(...args),
}));

const logAdminAction = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAdminAction: (...args: unknown[]) => logAdminAction(...args),
}));

const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/access", { headers });
}

function postRequest(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/access", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validBody = { displayName: "Musa Ibrahim", email: "musa@earlydays.example", isSuperAdmin: false, areas: ["blog"] };

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc, orderBy }));
  doc.mockImplementation(() => ({ get: docGet, set }));
  orderBy.mockImplementation(() => ({ get: listGet }));
  docGet.mockResolvedValue({ exists: false });
  process.env.ADMIN_EMAILS = "boss@earlydays.example";
  verifyIdToken.mockResolvedValue({ uid: "actor1", email: "boss@earlydays.example" });
  getUser.mockResolvedValue({ disabled: false });
  getUsers.mockResolvedValue({ users: [] });
  deleteUser.mockResolvedValue(undefined);
  checkRateLimit.mockResolvedValue(true);
});

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("GET /api/admin/access", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { GET } = await import("@/app/api/admin/access/route");
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { GET } = await import("@/app/api/admin/access/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(listGet).not.toHaveBeenCalled();
  });

  it("returns the admin list merged with disabled status", async () => {
    listGet.mockResolvedValue({
      docs: [
        { data: () => ({ uid: "u1", email: "a@b.com", displayName: "A", isSuperAdmin: false, areas: ["blog"], createdAt: 1, createdBy: "boss@earlydays.example" }) },
        { data: () => ({ uid: "u2", email: "b@b.com", displayName: "B", isSuperAdmin: true, areas: [], createdAt: 2, createdBy: "boss@earlydays.example" }) },
      ],
    });
    getUsers.mockResolvedValue({ users: [{ uid: "u1", disabled: true }, { uid: "u2", disabled: false }] });

    const { GET } = await import("@/app/api/admin/access/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.admins.find((a: { uid: string }) => a.uid === "u1").disabled).toBe(true);
    expect(json.admins.find((a: { uid: string }) => a.uid === "u2").disabled).toBe(false);
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("skips the Auth batch lookup entirely when there are no admins", async () => {
    listGet.mockResolvedValue({ docs: [] });

    const { GET } = await import("@/app/api/admin/access/route");
    const res = await GET(getRequest({ authorization: "Bearer ok" }));
    const json = await res.json();

    expect(json.admins).toEqual([]);
    expect(getUsers).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/access", () => {
  it("401s when the Authorization header is missing", async () => {
    verifyIdToken.mockReset();
    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({}, validBody));
    expect(res.status).toBe(401);
  });

  it("403s a non-superadmin", async () => {
    delete process.env.ADMIN_EMAILS;
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "blogger@earlydays.example" });
    docGet.mockResolvedValue({ exists: true, data: () => ({ isSuperAdmin: false, areas: ["blog"] }) });

    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));
    expect(res.status).toBe(403);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("429s and skips creation when rate limited", async () => {
    checkRateLimit.mockResolvedValue(false);

    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));

    expect(res.status).toBe(429);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s when displayName is missing", async () => {
    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validBody, displayName: "  " }));
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s on an invalid email", async () => {
    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s when a non-superadmin has no areas", async () => {
    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validBody, areas: [] }));
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("400s on an unknown area", async () => {
    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, { ...validBody, areas: ["not-a-real-area"] }));
    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("creates an admin, sends an invite, logs the action, and returns the reset link", async () => {
    createUser.mockResolvedValue({ uid: "newUid" });
    set.mockResolvedValue(undefined);
    generatePasswordResetLink.mockResolvedValue("https://earlydays.example/reset");
    sendAdminInviteEmail.mockResolvedValue(true);

    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "musa@earlydays.example", displayName: "Musa Ibrahim" })
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "newUid",
        email: "musa@earlydays.example",
        displayName: "Musa Ibrahim",
        isSuperAdmin: false,
        areas: ["blog"],
        createdBy: "boss@earlydays.example",
      })
    );
    expect(sendAdminInviteEmail).toHaveBeenCalledWith(
      { displayName: "Musa Ibrahim", email: "musa@earlydays.example" },
      "https://earlydays.example/reset"
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.created", targetUid: "newUid", actorEmail: "boss@earlydays.example" })
    );
    expect(json).toMatchObject({ uid: "newUid", resetLink: "https://earlydays.example/reset", emailSent: true });
  });

  it("409s when the email already has an account", async () => {
    createUser.mockRejectedValue(Object.assign(new Error("exists"), { code: "auth/email-already-exists" }));

    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));

    expect(res.status).toBe(409);
    expect(set).not.toHaveBeenCalled();
  });

  it("rolls back the Auth user when the Firestore write fails", async () => {
    createUser.mockResolvedValue({ uid: "newUid" });
    set.mockRejectedValue(new Error("firestore down"));

    const { POST } = await import("@/app/api/admin/access/route");
    const res = await POST(postRequest({ authorization: "Bearer ok" }, validBody));

    expect(res.status).toBe(500);
    expect(deleteUser).toHaveBeenCalledWith("newUid");
  });
});
